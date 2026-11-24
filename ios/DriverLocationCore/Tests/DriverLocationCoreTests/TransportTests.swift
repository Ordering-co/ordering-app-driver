import XCTest
@testable import DriverLocationCore

/// A `URLProtocol` stub: records the request and answers as scripted.
final class StubProtocol: URLProtocol {
    enum Behaviour {
        case status(Int)
        case redirect(to: String)
        case fail(URLError.Code)
    }

    static let lock = NSLock()
    static var behaviour: Behaviour = .status(200)
    static var seen: [URLRequest] = []
    static var seenBodies: [Data] = []

    static func reset(_ b: Behaviour) {
        lock.lock(); behaviour = b; seen = []; seenBodies = []; lock.unlock()
    }

    override class func canInit(with request: URLRequest) -> Bool { return true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { return request }

    override func startLoading() {
        var body = Data()
        if let stream = request.httpBodyStream {
            stream.open()
            var buffer = [UInt8](repeating: 0, count: 1024)
            while stream.hasBytesAvailable {
                let n = stream.read(&buffer, maxLength: buffer.count)
                if n <= 0 { break }
                body.append(buffer, count: n)
            }
            stream.close()
        } else if let b = request.httpBody {
            body = b
        }
        StubProtocol.lock.lock()
        StubProtocol.seen.append(request)
        StubProtocol.seenBodies.append(body)
        let behaviour = StubProtocol.behaviour
        StubProtocol.lock.unlock()
        let url = request.url!
        switch behaviour {
        case .status(let code):
            let response = HTTPURLResponse(url: url, statusCode: code, httpVersion: "HTTP/1.1", headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data("{}".utf8))
            client?.urlProtocolDidFinishLoading(self)
        case .redirect(let target):
            let response = HTTPURLResponse(url: url, statusCode: 307, httpVersion: "HTTP/1.1",
                                           headerFields: ["Location": target])!
            var next = URLRequest(url: URL(string: target)!)
            next.httpMethod = request.httpMethod
            client?.urlProtocol(self, wasRedirectedTo: next, redirectResponse: response)
            // If the session refuses to follow (the delegate answers nil), the 3xx answer is the result.
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocolDidFinishLoading(self)
        case .fail(let code):
            client?.urlProtocol(self, didFailWithError: URLError(code, userInfo: [
                NSURLErrorFailingURLStringErrorKey: "https://leak.example.com/?token=secret-token"
            ]))
        }
    }

    override func stopLoading() {}
}

final class TransportTests: XCTestCase {
    private let url = URL(string: testURL)!
    private let headers = ["Authorization": "Bearer secret-token"]
    private let body = Data(#"{"location":{"lat":1,"lng":2,"v":"1.0"},"driver_id":42}"#.utf8)

    private func send(_ transport: URLSessionTransport) -> TransportResult {
        let done = expectation(description: "answer")
        var result: TransportResult?
        transport.send(url: url, headers: headers, body: body) { result = $0; done.fulfill() }
        wait(for: [done], timeout: 5)
        return result!
    }

    func testPostsJsonWithTheHeadersAndTheBody() {
        StubProtocol.reset(.status(200))
        XCTAssertEqual(send(URLSessionTransport(protocolClasses: [StubProtocol.self])), .response(status: 200))
        let request = StubProtocol.seen[0]
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url, url)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer secret-token")
        XCTAssertEqual(StubProtocol.seenBodies[0], body)
    }

    func testTheAppsUserAgentAndDeviceIdReachTheServerInPlaceOfTheStacksOwn() throws {
        StubProtocol.reset(.status(200))
        let userAgent = "ODelivery/1.0 (co.ordering.delivery; build:1; iOS 18.2; iPhone15,2) CFNetwork/1568.200.51 Darwin/24.1.0"
        let config = try Config(url: testURL, headers: headers)
            .addingDefaultHeaders(["User-Agent": userAgent, "X-Device-Id-X": "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"])
        let transport = URLSessionTransport(protocolClasses: [StubProtocol.self])
        let done = expectation(description: "answer")
        transport.send(url: config.url, headers: config.headers, body: body) { _ in done.fulfill() }
        wait(for: [done], timeout: 5)
        let request = StubProtocol.seen[0]
        XCTAssertEqual(request.value(forHTTPHeaderField: "User-Agent"), userAgent)
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Device-Id-X"), "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer secret-token")
    }

    func testContentTypeCannotBeOverriddenByTheHeaders() {
        StubProtocol.reset(.status(200))
        let transport = URLSessionTransport(protocolClasses: [StubProtocol.self])
        let done = expectation(description: "answer")
        transport.send(url: url, headers: ["Content-Type": "text/plain"], body: body) { _ in done.fulfill() }
        wait(for: [done], timeout: 5)
        XCTAssertEqual(StubProtocol.seen[0].value(forHTTPHeaderField: "Content-Type"), "application/json")
    }

    func testStatusesAreReportedAsAnswers() {
        for code in [201, 400, 401, 408, 429, 500, 503] {
            StubProtocol.reset(.status(code))
            XCTAssertEqual(send(URLSessionTransport(protocolClasses: [StubProtocol.self])), .response(status: code))
        }
    }

    func testARedirectIsNotFollowedAndItsStatusIsReported() {
        StubProtocol.reset(.redirect(to: "https://elsewhere.example.com/steal"))
        XCTAssertEqual(send(URLSessionTransport(protocolClasses: [StubProtocol.self])), .response(status: 307))
        XCTAssertEqual(StubProtocol.seen.count, 1) // the Authorization header never went to the other host
    }

    func testANetworkErrorIsReportedWithoutUrlOrToken() {
        StubProtocol.reset(.fail(.notConnectedToInternet))
        guard case .networkError(let text) = send(URLSessionTransport(protocolClasses: [StubProtocol.self])) else {
            return XCTFail("expected a network error")
        }
        XCTAssertEqual(text, "NSURLErrorDomain/-1009")
        XCTAssertFalse(text.contains("secret-token"))
        XCTAssertFalse(text.contains("example.com"))
    }

    func testTimeoutsAreBounded() {
        XCTAssertEqual(URLSessionTransport.requestTimeout, 20)
        XCTAssertEqual(URLSessionTransport.resourceTimeout, 30)
    }

    func testUnreachableHostGivesANetworkErrorNotACrash() {
        let transport = URLSessionTransport()
        let done = expectation(description: "answer")
        var result: TransportResult?
        transport.send(url: URL(string: "http://127.0.0.1:9/locations")!, headers: headers, body: body) { result = $0; done.fulfill() }
        wait(for: [done], timeout: 10)
        guard case .networkError(let text)? = result else { return XCTFail("expected a network error") }
        XCTAssertFalse(text.contains("secret-token"))
    }
}
