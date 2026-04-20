import { LayerNode } from "../../data/coatings";

type Props = {
  layers: LayerNode[];
};

export default function LayerGraphic({ layers }: Props) {
  // We draw 3D blocks.
  // Isometric projection params:
  // We'll just draw polygons.
  // We render them from bottom to top. But DOM order needs bottom layer to be drawn first so z-index is correct.
  // Wait, the coating arrays are top to bottom (Top layer first). So we need to reverse them to draw bottom first.
  const reversed = [...layers].reverse();

  // SVG total canvas can be ~160x100
  // Let's generate polygon paths for a block.
  const drawLayer = (color: string, thickness: string, yOffset: number) => {
    // Thickness determines the height of the block
    let h = 8;
    if (thickness === "thick") h = 18;
    if (thickness === "extra-thick") h = 26;

    // We use a base rhombus for the top surface: (0, 20), (50, 0), (100, 20), (50, 40)
    // Actually, making it look good is easier to hardcode an isometric path.
    // Base width 120
    const w = 120;
    const dy = 25; // How much it slopes down
    
    // Top face
    const topPts = `0,${dy} ${w/2},0 ${w},${dy} ${w/2},${dy*2}`;
    
    // Left face
    const leftPts = `0,${dy} ${w/2},${dy*2} ${w/2},${dy*2 + h} 0,${dy + h}`;
    
    // Right face
    const rightPts = `${w/2},${dy*2} ${w},${dy} ${w},${dy + h} ${w/2},${dy*2 + h}`;

    return (
      <g transform={`translate(10, ${yOffset})`}>
        {/* Right face (darker) */}
        <polygon points={rightPts} fill={color} opacity={0.6} />
        {/* Left face (slightly darker) */}
        <polygon points={leftPts} fill={color} opacity={0.8} />
        {/* Top face (base color) */}
        <polygon points={topPts} fill={color} />
      </g>
    );
  };

  // We trace upwards.
  // yBase starts at some bottom value and goes up depending on layer thicknesses.
  let currentY = layers.length * 20; 

  return (
    <div className="relative flex items-center justify-center w-full min-h-[140px]">
      <svg width="150" height="120" className="drop-shadow-md">
        {reversed.map((layer, idx) => {
          let h = 8;
          if (layer.thickness === "thick") h = 18;
          if (layer.thickness === "extra-thick") h = 26;
          // Adjust overlap: move top layer down slightly so they look stacked
          const yPos = currentY;
          currentY -= (h + 5); 
          return <g key={idx}>{drawLayer(layer.color, layer.thickness, yPos)}</g>;
        })}
      </svg>
      
      {/* Absolute positioned labels */}
      <div className="absolute inset-y-0 right-0 left-[60%] flex flex-col items-start justify-center gap-2">
        {layers.map((l, i) => (
          <div key={i} className="text-xs text-gray-700 font-bold leading-tight flex flex-col pt-1">
             <div className="flex items-center">
                <span className="inline-block w-4 h-px bg-gray-400 mr-1" />
                {l.name}
             </div>
             {l.note && <span className="text-[10px] text-gray-500 font-normal ml-5 whitespace-pre-wrap">{l.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
