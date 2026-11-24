// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "DriverLocationCore",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "DriverLocationCore", targets: ["DriverLocationCore"])
    ],
    targets: [
        .target(name: "DriverLocationCore"),
        .testTarget(name: "DriverLocationCoreTests", dependencies: ["DriverLocationCore"])
    ]
)
