import { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from "../config";

const safeImageTypes = new Set([
    "image/avif",
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp"
]);
const failedMediaRequests = new Set();

export function useProtectedMedia(path, refreshKey = "", mediaKind = "") {
    const requestKey = `${path || ""}\u0000${refreshKey || ""}\u0000${mediaKind}`;
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!path) return undefined;
        const controller = new AbortController();
        let active = true;
        let objectUrl = null;

        const cacheProfilePhotoFailure = mediaKind === "image" && path.startsWith("/media/profiles/");
        if (cacheProfilePhotoFailure && failedMediaRequests.has(requestKey)) {
            return () => {
                active = false;
                controller.abort();
            };
        }

        axios.get(apiUrl(path), {
            responseType: "blob",
            signal: controller.signal
        }).then((response) => {
            const contentType = (response.headers["content-type"] || response.data.type || "")
                .split(";", 1)[0].trim().toLowerCase();
            if ((mediaKind === "image" && !safeImageTypes.has(contentType)) ||
                (mediaKind === "audio" && !contentType.startsWith("audio/"))) {
                throw new Error("Unsupported media type");
            }
            objectUrl = URL.createObjectURL(response.data);
            if (!active) {
                URL.revokeObjectURL(objectUrl);
                return;
            }
            setResult({ requestKey, url: objectUrl, error: null });
        }).catch((error) => {
            if (active) {
                if (cacheProfilePhotoFailure && error.response?.status === 404) {
                    failedMediaRequests.add(requestKey);
                }
                setResult({ requestKey, url: null, error: "Media could not be loaded." });
            }
        });

        return () => {
            active = false;
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [path, requestKey, mediaKind]);

    const currentResult = result?.requestKey === requestKey ? result : null;
    return {
        url: currentResult?.url || null,
        error: currentResult?.error || (mediaKind === "image" && path?.startsWith("/media/profiles/") && failedMediaRequests.has(requestKey)
            ? "Media could not be loaded."
            : null),
        loading: Boolean(path) && !currentResult
    };
}
