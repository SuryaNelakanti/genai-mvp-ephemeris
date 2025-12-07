export interface HoroscopeData {
    date: string;
    sign: string;
    prediction: string;
    luckyNumber: number;
    luckyColor: string;
    mood: string;
}

export interface AtGlanceData {
    mood: string;
    scores: {
        love: number;
        work: number;
        creativity: number;
    };
    aspects: string[];
    insights: {
        love: string;
        work: string;
        creativity: string;
    };
}

export interface AnalysisData {
    transits?: { transit: string; description: string }[];
    forecast?: { time: string; energy: string; desc: string }[];
    theme?: string;
    overview?: string;
    days?: { day: string; energy: string; desc: string }[];
    weeks?: { week: string; focus: string; desc: string }[];
}

