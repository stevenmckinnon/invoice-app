import XCTest
@testable import Caley

final class OfflineCacheTests: XCTestCase {
    override func tearDown() {
        DiskCache.clear()
        super.tearDown()
    }

    func testOnlyHarmlessReadsAreSaved() {
        XCTAssertTrue(DiskCache.isCacheable("api/invoices"))
        XCTAssertTrue(DiskCache.isCacheable("api/invoices/clx123abc"))
        XCTAssertTrue(DiskCache.isCacheable("api/clients"))
        XCTAssertTrue(DiskCache.isCacheable("api/profile"))
        // A saved answer would hand out a number that is already taken
        XCTAssertFalse(DiskCache.isCacheable("api/invoices/next-number"))
        XCTAssertFalse(DiskCache.isCacheable("api/invoices/clx123abc/pdf"))
        XCTAssertFalse(DiskCache.isCacheable("api/auth/get-session"))
        XCTAssertFalse(DiskCache.isCacheable("api/chat"))
    }

    func testRoundTripAndClear() throws {
        XCTAssertNil(DiskCache.read("api/clients"))
        DiskCache.write(Data("[1,2]".utf8), for: "api/clients")
        let saved = try XCTUnwrap(DiskCache.read("api/clients"))
        XCTAssertEqual(String(decoding: saved.data, as: UTF8.self), "[1,2]")
        XCTAssertLessThan(abs(saved.savedAt.timeIntervalSinceNow), 60)
        DiskCache.clear()
        XCTAssertNil(DiskCache.read("api/clients"))
    }

    func testEachPathKeepsItsOwnCopy() {
        DiskCache.write(Data("a".utf8), for: "api/invoices/one")
        DiskCache.write(Data("b".utf8), for: "api/invoices/two")
        XCTAssertEqual(DiskCache.read("api/invoices/one")?.data, Data("a".utf8))
        XCTAssertEqual(DiskCache.read("api/invoices/two")?.data, Data("b".utf8))
    }

    func testOnlyConnectionFailuresCountAsOffline() {
        XCTAssertTrue(URLError(.notConnectedToInternet).isOffline)
        XCTAssertTrue(URLError(.cannotConnectToHost).isOffline)
        XCTAssertTrue(URLError(.timedOut).isOffline)
        // The server answered, or the request was never valid: saved data would hide a real problem
        XCTAssertFalse(URLError(.badServerResponse).isOffline)
        XCTAssertFalse(URLError(.appTransportSecurityRequiresSecureConnection).isOffline)
        XCTAssertFalse(URLError(.cancelled).isOffline)
    }
}
