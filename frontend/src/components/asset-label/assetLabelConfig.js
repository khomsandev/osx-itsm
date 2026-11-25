export const LABEL_SIZES = {
    "40x20": {
        name: "40 × 20 mm",
        width: 40,
        height: 20,
        qrSize: 13,
        fontSize: 6.5,
    },
    "50x30": {
        name: "50 × 30 mm",
        width: 50,
        height: 30,
        qrSize: 20,
        fontSize: 8,
    },
    "60x40": {
        name: "60 × 40 mm",
        width: 60,
        height: 40,
        qrSize: 26,
        fontSize: 9,
    },
};

export const PRINT_MODES = {
    THERMAL: "THERMAL",
    A4: "A4",
};

export const DEFAULT_LABEL_CONFIG = {
    size: "50x30",
    copies: 1,
    printMode: PRINT_MODES.THERMAL,
    showAssetName: true,
    showBrandModel: true,
};

export const LABEL_HEADER = "OSX | IT ASSET";

export const MAX_COPIES = 20;
export const MAX_TOTAL_LABELS = 500;

export function getAssetQrValue(asset) {
    return String(asset.asset_code || "").trim();
}
