async function visibleReadBy(messages, User) {
    const list = Array.isArray(messages) ? messages : [messages];
    const readerIds = [...new Set(list.flatMap((message) =>
        (message.readBy || []).map((readerId) => readerId.toString())
    ))];
    if (!readerIds.length) return list;
    const readers = await User.find({
        _id: { $in: readerIds },
        readReceiptsEnabled: { $ne: false }
    }).select("_id").lean();
    const allowed = new Set(readers.map((reader) => reader._id.toString()));
    return list.map((message) => ({
        ...(message.toObject ? message.toObject() : message),
        readBy: (message.readBy || []).filter((readerId) => allowed.has(readerId.toString()))
    }));
}

module.exports = { visibleReadBy };
