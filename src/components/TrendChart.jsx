import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<Line
    type="monotone"
    dataKey="value"
    stroke="#3B82F6"
    strokeWidth={2}
    dot={{
        fill: '#3B82F6',
        r: 4,
        cursor: 'pointer',
        onClick: (props) => onDataPointClick && onDataPointClick(props.payload)
    }}
    activeDot={{
        r: 6,
        cursor: 'pointer',
        onClick: (props) => onDataPointClick && onDataPointClick(props.payload)
    }}
/>
if (!data || data.length === 0) {
    return (
        <div className="h-64 flex items-center justify-center bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
            <p className="text-gray-500">No data available for chart</p>
        </div>
    );
}

// Sort data by date
const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

return (
    <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    fontSize={12}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                    itemStyle={{ color: '#60A5FA' }}
                    formatter={(value) => [`${value} ${unit || ''}`, metricName]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);
};

export default TrendChart;
