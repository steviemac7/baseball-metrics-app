import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload, label, unit, metricName }) => {
    if (active && payload && payload.length) {
        // payload[0].payload contains the full data object
        const dataPoint = payload[0].payload;
        const dateStr = dataPoint.date;

        // Safe date formatting
        const displayDate = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return (
            <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{displayDate}</p>
                <p className="text-blue-400 font-bold text-lg">
                    {payload[0].value} <span className="text-sm font-normal text-gray-500">{unit}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{metricName}</p>
            </div>
        );
    }
    return null;
};

const TrendChart = ({ data, metricName, unit, onDataPointClick }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                <p className="text-gray-500">No data available for chart</p>
            </div>
        );
    }

    // Sort data by date and add a unique index for the X-axis mapping
    const sortedData = [...data]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item, index) => ({ ...item, uniqueIdx: index }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="uniqueIdx"
                        type="category"
                        stroke="#9CA3AF"
                        tickFormatter={(uniqueIdx) => {
                            const item = sortedData[uniqueIdx];
                            return item ? new Date(item.date).toLocaleDateString() : '';
                        }}
                        fontSize={12}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip
                        content={<CustomTooltip unit={unit} metricName={metricName} />}
                        cursor={{ stroke: '#6B7280', strokeWidth: 1 }}
                        isAnimationActive={false}
                        trigger="hover"
                    />
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
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
