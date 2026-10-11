import { io } from "socket.io-client";
import { getFreshIdToken } from "./firebase";

const socket = io("http://localhost:3030", {
    autoConnect: false,
    auth: async (callback) => {
        try {
            callback({ token: await getFreshIdToken() });
        } catch {
            callback({ token: null });
        }
    }
});

export default socket;
