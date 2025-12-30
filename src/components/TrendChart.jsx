import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useMemo } from 'react';

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

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Daily Averages for the Trend Line
    const dailyAverages = useMemo(() => {
        const grouped = {};
        sortedData.forEach(item => {
            if (!grouped[item.date]) {
                grouped[item.date] = { sum: 0, count: 0, date: item.date };
            }
            grouped[item.date].sum += Number(item.value);
            grouped[item.date].count += 1;
        });

        return Object.values(grouped)
            .map(g => ({
                date: g.date,
                average: Number((g.sum / g.count).toFixed(2))
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [sortedData]);

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="date"
                        type="category"
                        allowDuplicatedCategory={false}
                        data={dailyAverages} // Drive the axis with unique dates
                        stroke="#9CA3AF"
                        tickFormatter={(dateStr) => {
                            if (!dateStr) return '';
                            return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                            });
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

                    {/* Raw Data Points (Vertical Stack, No Line) */}
                    <Line
                        data={sortedData}
                        type="monotone"
                        dataKey="value"
                        stroke="none" // No connecting line for raw stats
                        isAnimationActive={false}
                        dot={{
                            fill: '#60A5FA', // Lighter blue for raw dots
                            r: 3,
                            strokeWidth: 0,
                            cursor: 'pointer',
                            onClick: (props) => onDataPointClick && onDataPointClick(props.payload)
                        }}
                        activeDot={{ r: 5 }}
                        name="Individual Reading"
                    />

                    {/* Daily Average Line (Red Dots) */}
                    <Line
                        data={dailyAverages}
                        type="monotone"
                        dataKey="average"
                        stroke="#EF4444" // Red connecting line
                        strokeWidth={2}
                        dot={{
                            fill: '#EF4444', // Red dots
                            stroke: '#EF4444',
                            r: 4,
                            cursor: 'pointer'
                        }}
                        activeDot={{ r: 6, fill: '#EF4444' }}
                        name="Daily Avg"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
