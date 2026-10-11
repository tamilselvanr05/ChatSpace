import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectSuspiciousMessage } from "./scamDetector.js";

describe("detectSuspiciousMessage", () => {
    it("does not flag ordinary conversation or a normal external URL", () => {
        assert.equal(detectSuspiciousMessage("See you at lunch https://example.com/menu"), null);
        assert.equal(detectSuspiciousMessage("Thanks for sharing the project update."), null);
    });

    it("warns on requests for passwords and verification codes", () => {
        const result = detectSuspiciousMessage("Please send me your OTP and password now");
        assert.equal(result.risk, "High");
        assert.match(result.reasons.join(" "), /password, OTP, or verification code/);
    });

    it("warns on urgent money pressure and prize fee patterns", () => {
        assert.equal(detectSuspiciousMessage("Urgent: transfer money immediately").risk, "High");
        assert.equal(detectSuspiciousMessage("You won a lottery prize, pay a processing fee to claim").risk, "Medium");
    });

    it("warns on URL shorteners and misleading displayed destinations", () => {
        assert.match(detectSuspiciousMessage("Open https://bit.ly/abc").reasons.join(" "), /URL-shortening/);
        assert.match(detectSuspiciousMessage("[https://example.com](https://attacker.test/path)").reasons.join(" "), /displayed link text/);
    });
});
