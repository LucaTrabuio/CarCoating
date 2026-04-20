"use client";

import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

type RadarData = {
  subject: string;
  A: number;
  fullMark: number;
};

type Props = {
  data: RadarData[];
  color: string;
};

export default function RadarGraph({ data, color }: Props) {
  // We need to create a custom tick to offset the labels properly
  return (
    <div className="w-full h-48 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#333', fontSize: 12, fontWeight: 600 }}
          />
          <Radar
            name="Coating"
            dataKey="A"
            stroke={color}
            fill={color}
            fillOpacity={0.4}
            isAnimationActive={false} // Disable animation for consistency with images
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
