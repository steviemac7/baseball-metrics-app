export const METRIC_GROUPS = {
    'Hitting': [
        { id: 'exit_velo_tee', label: 'Exit Velo - Off Tee', unit: 'mph' },
        { id: 'exit_velo_front', label: 'Exit Velo - Front Toss', unit: 'mph' },
        { id: 'exit_velo_machine', label: 'Exit Velo - Machine', unit: 'mph' },
        { id: 'dist_tee', label: 'Distance - Off Tee', unit: 'ft' },
    ],
    'Positional Throwing': [
        { id: 'if_glove', label: 'Infield - Ball in Glove', unit: 'mph' },
        { id: 'if_loss', label: 'Infield - Live Fungo', unit: 'mph' },
        { id: 'of_glove', label: 'Outfield - Ball in Glove', unit: 'mph' },
        { id: 'of_loss', label: 'Outfield - Live Fungo', unit: 'mph' },
    ],
    'Catcher Throwing': [
        { id: 'c_to_2b_glove', label: 'Catcher to 2B - Ball in Glove', unit: 'mph' },
        { id: 'c_to_2b_live', label: 'Catcher to 2B - Live', unit: 'mph' },
        { id: 'pop_2b', label: 'Pop Time to 2B', unit: 'sec' },
        { id: 'pop_3b', label: 'Pop Time to 3B', unit: 'sec' },
    ],
    'Pitching': [
        { id: 'fb', label: 'Fastball', unit: 'mph' },
        { id: 'cb', label: 'Curveball', unit: 'mph' },
        { id: 'sl', label: 'Slider', unit: 'mph' },
        { id: 'ch', label: 'Changeup', unit: 'mph' },
    ],
    'Foot Speed': [
        { id: 'dash_60', label: '60 Yard Dash', unit: 'sec' },
        { id: 'dash_30', label: '30 Yard Dash', unit: 'sec' },
        { id: 'home_to_2b', label: 'Home to 2B', unit: 'sec' },
        { id: 'steal_2b', label: 'Steal 2B (12ft lead)', unit: 'sec' },
    ]
};

export const ALL_METRICS = Object.values(METRIC_GROUPS).flat();
