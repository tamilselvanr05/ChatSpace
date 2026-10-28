import assert from "node:assert/strict";
import test from "node:test";
import { updateProfilePhotoViewer } from "./profilePhotoViewer.js";

test("a photo removal closes the matching viewer instead of requesting media without a reference", () => {
    const previous = { userId: "user-1", username: "Alex", profilePhoto: "https://res.cloudinary.com/example/image/upload/photo.jpg" };

    assert.equal(updateProfilePhotoViewer(previous, "user-1", null), null);
});

test("profile photo socket updates preserve the viewer for the matching user", () => {
    const previous = { userId: "user-1", username: "Alex", profilePhoto: "old-reference" };

    assert.deepEqual(updateProfilePhotoViewer(previous, "user-1", "new-reference"), {
        ...previous,
        profilePhoto: "new-reference"
    });
});

test("profile photo socket updates leave another user's viewer unchanged", () => {
    const previous = { userId: "user-1", username: "Alex", profilePhoto: "old-reference" };

    assert.equal(updateProfilePhotoViewer(previous, "user-2", null), previous);
});
