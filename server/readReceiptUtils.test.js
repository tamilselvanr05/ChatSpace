const test = require("node:test");
const assert = require("node:assert/strict");
const { visibleReadBy } = require("./readReceiptUtils");

function mockUserModel(enabledIds) {
    return {
        find(query) {
            return {
                select() {
                    return {
                        lean: async () => enabledIds
                            .filter((id) => query._id.$in.includes(id))
                            .map((_id) => ({ _id }))
                    };
                }
            };
        }
    };
}

test("read receipts only expose IDs whose users allow receipts", async () => {
    const message = { _id: "message-1", readBy: ["reader-on", "reader-off"] };
    const [result] = await visibleReadBy(message, mockUserModel(["reader-on"]));
    assert.deepEqual(result.readBy, ["reader-on"]);
    assert.deepEqual(message.readBy, ["reader-on", "reader-off"]);
});

test("messages without reads do not query users", async () => {
    const userModel = { find() { assert.fail("should not query users for empty receipts"); } };
    const [result] = await visibleReadBy({ readBy: [] }, userModel);
    assert.deepEqual(result.readBy, []);
});
