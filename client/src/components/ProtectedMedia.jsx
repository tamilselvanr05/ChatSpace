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

function safeDownloadName(value) {
    return [...String(value || "download")]
        .filter((character) => character !== "/" && character !== "\\" &&
            character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
        .join("");
}

function useProtectedMedia(path, refreshKey = "", mediaKind = "") {
    const requestKey = `${path || ""}\u0000${refreshKey || ""}\u0000${mediaKind}`;
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!path) return undefined;
        const controller = new AbortController();
        let active = true;
        let objectUrl = null;

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
        }).catch(() => {
            if (active) setResult({ requestKey, url: null, error: "Media could not be loaded." });
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
        error: currentResult?.error || null,
        loading: Boolean(path) && !currentResult
    };
}

export function ProtectedImage({ path, refreshKey, alt = "", className, style, fallback = "Image unavailable", loadingLabel = "Loading media…" }) {
    const { url, error, loading } = useProtectedMedia(path, refreshKey, "image");
    const [failedUrl, setFailedUrl] = useState(null);

    if (error || (url && failedUrl === url)) {
        return <span className={className} role="img" aria-label={alt || "Image unavailable"} style={style}>{fallback}</span>;
    }
    if (!url) {
        return <span className={className} role="status" aria-label={loading ? loadingLabel : "Image unavailable"} style={style}>{loading ? loadingLabel : ""}</span>;
    }
    return (
        <img
            src={url}
            alt={alt}
            className={className}
            style={style}
            onError={() => setFailedUrl(url)}
        />
    );
}

export function ProtectedAudio({ path, style }) {
    const { url, error, loading } = useProtectedMedia(path, "", "audio");
    if (error) return <span role="alert">Audio could not be loaded.</span>;
    if (!url) return <span role="status">{loading ? "Loading audio…" : "Audio unavailable"}</span>;
    return <audio controls preload="metadata" src={url} style={style} />;
}

export function ProtectedDownload({ path, fileName, children, className, style }) {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    const download = async () => {
        if (status === "loading") return;
        setStatus("loading");
        setError("");
        let objectUrl;
        try {
            const response = await axios.get(apiUrl(path), { responseType: "blob" });
            objectUrl = URL.createObjectURL(response.data);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = safeDownloadName(fileName);
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
            setStatus("idle");
        } catch {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setError("Download failed. Check your connection and try again.");
            setStatus("idle");
        }
    };

    return (
        <>
            <button type="button" className={className || "cs-message-download"} style={style} onClick={download} disabled={status === "loading"}>
                {status === "loading" ? "Loading…" : children || "Download"}
            </button>
            {error && <span role="alert">{error}</span>}
        </>
    );
}
