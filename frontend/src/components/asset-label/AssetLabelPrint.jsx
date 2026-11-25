import AssetLabel from "./AssetLabel";

import {
    LABEL_SIZES,
    PRINT_MODES,
} from "./assetLabelConfig";

export default function AssetLabelPrint({
    assets,
    config,
    printRef,
}) {
    const size = LABEL_SIZES[config.size];

    const labels = assets.flatMap((asset) =>
        Array.from(
            { length: Number(config.copies) },
            (_, index) => ({
                key: `${asset.id}-${index}`,
                asset,
            })
        )
    );

    const isA4 = config.printMode === PRINT_MODES.A4;

    // A4: พื้นที่พิมพ์หลังหัก Margin 10 mm
    const gap = 2;

    const columns = Math.floor(
        (190 + gap) / (size.width + gap)
    );

    const rows = Math.floor(
        (277 + gap) / (size.height + gap)
    );

    const perPage = isA4 ? columns * rows : 1;

    const pages = [];

    for (let i = 0; i < labels.length; i += perPage) {
        pages.push(labels.slice(i, i + perPage));
    }

    return (
        <div
            ref={printRef}
            className={`osx-label-print-root ${
                isA4 ? "mode-a4" : "mode-thermal"
            }`}
        >
            {pages.map((page, pageIndex) => (
                <div
                    key={pageIndex}
                    className="osx-label-print-page"
                    style={{
                        gridTemplateColumns:
                            `repeat(${isA4 ? columns : 1}, ${size.width}mm)`,
                        gap: isA4 ? "2mm" : "0",
                    }}
                >
                    {page.map(({ key, asset }) => (
                        <AssetLabel
                            key={key}
                            asset={asset}
                            config={config}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
