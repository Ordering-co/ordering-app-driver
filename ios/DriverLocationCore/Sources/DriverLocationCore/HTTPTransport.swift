import Foundation

public enum TransportResult: Equatable {
    /// The server answered `status`. `retryAfter` is the `Retry-After` header of a 429 / 503 in seconds, already bounded by
    /// `RetryAfter.maxSeconds` (nil = none, or one this module cannot read).
    case response(status: Int, retryAfter: TimeInterval? = nil)
    /// The request did not get an answer. The text is a short code, never a URL, header or token.
    case networkError(String)
}

/// The `Retry-After` header of a 429 / 503: delta-seconds only (an HTTP-date is ignored: the backoff applies), bounded so a server
/// cannot silence the module for long.
public enum RetryAfter {
    /// The longest wait a server may ask for (5 minutes).
    public static let maxSeconds: TimeInterval = 300

    /// Seconds for `value` (`"120"` = 120 s), at most `maxSeconds`; nil when it is not a plain number of seconds.
    public static func parse(_ value: String?) -> TimeInterval? {
        guard let text = value?.trimmingCharacters(in: .whitespaces), !text.isEmpty, text.count <= 9,
              text.allSatisfy({ $0.isASCII && $0.isNumber }), let seconds = TimeInterval(text) else { return nil }
        return min(seconds, maxSeconds)
    }

    /// The wait for a retry: the backoff's delay, or the server's request when it is longer; only for 429 and 503.
    public static func delay(backoff: TimeInterval, status: Int?, retryAfter: TimeInterval?) -> TimeInterval {
        guard let status = status, status == 429 || status == 503, let retryAfter = retryAfter else { return backoff }
        return max(backoff, min(retryAfter, maxSeconds))
    }
}

public protocol HTTPTransport: AnyObject {
    /// `completion` may be called on any thread, exactly once.
    func send(url: URL, headers: [String: String], body: Data, completion: @escaping (TransportResult) -> Void)
}

/// `URLSession` implementation: ephemeral session (no cache, cookies or credentials stored),
/// JSON content type, bounded timeouts, no redirects followed. Neither the headers nor the body are ever logged,
/// and error descriptions carry the error code only.
public final class URLSessionTransport: NSObject, HTTPTransport, URLSessionTaskDelegate {
    public static let requestTimeout: TimeInterval = 20
    public static let resourceTimeout: TimeInterval = 30

    private var session: URLSession!

    /// - Parameter protocolClasses: for tests (a `URLProtocol` stub).
    public init(protocolClasses: [AnyClass]? = nil) {
        super.init()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = URLSessionTransport.requestTimeout
        configuration.timeoutIntervalForResource = URLSessionTransport.resourceTimeout
        configuration.waitsForConnectivity = false
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.urlCache = nil
        if let protocolClasses = protocolClasses {
            configuration.protocolClasses = protocolClasses
        }
        session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }

    public func send(url: URL, headers: [String: String], body: Data, completion: @escaping (TransportResult) -> Void) {
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData,
                                 timeoutInterval: URLSessionTransport.requestTimeout)
        request.httpMethod = "POST"
        for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        let task = session.dataTask(with: request) { _, response, error in
            if let error = error {
                completion(.networkError(URLSessionTransport.describe(error)))
            } else if let http = response as? HTTPURLResponse {
                let status = http.statusCode
                let retryAfter = (status == 429 || status == 503) ? RetryAfter.parse(http.value(forHTTPHeaderField: "Retry-After")) : nil
                completion(.response(status: status, retryAfter: retryAfter))
            } else {
                completion(.networkError("no_http_response"))
            }
        }
        task.resume()
    }

    /// Redirects are never followed: the 3xx answer itself is reported (and the fix dropped by the sender),
    /// so the token is never replayed on another URL.
    public func urlSession(_ session: URLSession, task: URLSessionTask,
                           willPerformHTTPRedirection response: HTTPURLResponse,
                           newRequest request: URLRequest,
                           completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }

    /// `NSURLErrorDomain/-1009`: domain and code only, no `localizedDescription`, no userInfo (it holds the URL).
    static func describe(_ error: Error) -> String {
        let ns = error as NSError
        return "\(ns.domain)/\(ns.code)"
    }
}
