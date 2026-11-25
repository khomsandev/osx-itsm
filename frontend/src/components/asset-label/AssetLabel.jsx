import { QRCodeSVG } from "qrcode.react";

import {
    LABEL_SIZES,
    LABEL_HEADER,
    getAssetQrValue,
} from "./assetLabelConfig";

import "./assetLabel.css";

export default function AssetLabel({
    asset,
    config,
}) {
    const size = LABEL_SIZES[config.size]
        || LABEL_SIZES["50x30"];

    const brandModel = [
        asset.brand,
        asset.model,
    ].filter(Boolean).join(" ");

    return (
        <div
            className="osx-asset-label"
            style={{
                width: `${size.width}mm`,
                height: `${size.height}mm`,
                "--label-font-size": `${size.fontSize}pt`,
                "--label-qr-size": `${size.qrSize}mm`,
            }}
        >
            <div className="osx-label-header">
                {LABEL_HEADER}
            </div>

            <div className="osx-label-body">
                <div className="osx-label-qr">
                    <QRCodeSVG
                        value={getAssetQrValue(asset)}
                        size={256}
                        level="M"
                        marginSize={4}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                    />
                </div>

                <div className="osx-label-info">
                    <strong className="osx-label-code">
                        {asset.asset_code}
                    </strong>

                    {config.showAssetName && (
                        <span className="osx-label-name">
                            {asset.asset_name}
                        </span>
                    )}

                    {config.showBrandModel && brandModel && (
                        <span className="osx-label-model">
                            {brandModel}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
