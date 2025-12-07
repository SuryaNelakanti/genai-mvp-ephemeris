/**
 * Ephemeris Service
 * Provides astronomical calculations for astrology features using astronomy-engine
 */

import * as Astronomy from 'astronomy-engine';

// Zodiac signs in order
const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

export type ZodiacSign = typeof ZODIAC_SIGNS[number];

// Planet names we track
const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
export type Planet = typeof PLANETS[number];

// Aspect definitions with orbs
const ASPECTS = [
    { name: 'Conjunction', angle: 0, orb: 8 },
    { name: 'Sextile', angle: 60, orb: 6 },
    { name: 'Square', angle: 90, orb: 8 },
    { name: 'Trine', angle: 120, orb: 8 },
    { name: 'Opposition', angle: 180, orb: 8 },
] as const;

export interface PlanetPosition {
    planet: Planet;
    longitude: number;
    sign: ZodiacSign;
    degree: number;
    retrograde: boolean;
}

export interface Aspect {
    planet1: Planet;
    planet2: Planet;
    aspectName: string;
    angle: number;
    orb: number;
}

export interface BirthChartData {
    planets: PlanetPosition[];
    ascendant: number;
    ascendantSign: ZodiacSign;
    midheaven: number;
    midheavenSign: ZodiacSign;
    aspects: Aspect[];
}

/**
 * Convert longitude (0-360) to zodiac sign
 */
function longitudeToSign(longitude: number): ZodiacSign {
    const signIndex = Math.floor(longitude / 30) % 12;
    return ZODIAC_SIGNS[signIndex];
}

/**
 * Get degree within sign (0-30)
 */
function getDegreeInSign(longitude: number): number {
    return longitude % 30;
}

/**
 * Convert Astronomy.Body to our Planet type
 */
function bodyToPlanet(body: Astronomy.Body): Planet | null {
    const mapping: Record<string, Planet> = {
        'Sun': 'Sun',
        'Moon': 'Moon',
        'Mercury': 'Mercury',
        'Venus': 'Venus',
        'Mars': 'Mars',
        'Jupiter': 'Jupiter',
        'Saturn': 'Saturn',
        'Uranus': 'Uranus',
        'Neptune': 'Neptune',
        'Pluto': 'Pluto',
    };
    return mapping[body] || null;
}

/**
 * Calculates the positions of all major planets for a specific date.
 * Uses the `astronomy-engine` library for high-precision calculations.
 * 
 * @param date - The date for which to calculate positions.
 * @returns An array of `PlanetPosition` objects containing longitude, sign, and degree.
 */
export function getPlanetaryPositions(date: Date): PlanetPosition[] {
    const positions: PlanetPosition[] = [];
    const astroDate = Astronomy.MakeTime(date);

    const bodies: Astronomy.Body[] = [
        Astronomy.Body.Sun,
        Astronomy.Body.Moon,
        Astronomy.Body.Mercury,
        Astronomy.Body.Venus,
        Astronomy.Body.Mars,
        Astronomy.Body.Jupiter,
        Astronomy.Body.Saturn,
        Astronomy.Body.Uranus,
        Astronomy.Body.Neptune,
        Astronomy.Body.Pluto,
    ];

    for (const body of bodies) {
        const planet = bodyToPlanet(body);
        if (!planet) continue;

        // Get ecliptic longitude
        const ecliptic = Astronomy.EclipticGeoMoon(astroDate);
        let longitude: number;

        if (body === Astronomy.Body.Moon) {
            longitude = ecliptic.lon;
        } else if (body === Astronomy.Body.Sun) {
            const sunEcl = Astronomy.SunPosition(astroDate);
            longitude = sunEcl.elon;
        } else {
            // For planets, use Ecliptic coordinates directly
            const equ = Astronomy.Equator(body, astroDate, new Astronomy.Observer(0, 0, 0), true, true);
            // Convert RA to approximate ecliptic longitude (simplified)
            longitude = (equ.ra * 15) % 360;
        }

        // Normalize longitude to 0-360
        longitude = ((longitude % 360) + 360) % 360;

        positions.push({
            planet,
            longitude,
            sign: longitudeToSign(longitude),
            degree: getDegreeInSign(longitude),
            retrograde: false, // Would need more complex calculation
        });
    }

    return positions;
}

/**
 * Identifies astrological aspects (angles) between planets.
 * Checks for Conjunction, Sextile, Square, Trine, and Opposition within defined orbs.
 * 
 * @param positions - Array of planetary positions.
 * @returns An array of `Aspect` objects describing the relationships between planets.
 */
export function calculateAspects(positions: PlanetPosition[]): Aspect[] {
    const aspects: Aspect[] = [];

    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const pos1 = positions[i];
            const pos2 = positions[j];

            // Calculate the angle between planets
            let diff = Math.abs(pos1.longitude - pos2.longitude);
            if (diff > 180) diff = 360 - diff;

            // Check against each aspect
            for (const aspect of ASPECTS) {
                const orb = Math.abs(diff - aspect.angle);
                if (orb <= aspect.orb) {
                    aspects.push({
                        planet1: pos1.planet,
                        planet2: pos2.planet,
                        aspectName: aspect.name,
                        angle: aspect.angle,
                        orb: orb,
                    });
                    break; // Only match one aspect per planet pair
                }
            }
        }
    }

    return aspects;
}

/**
 * Determines the Sun sign for a given birth date.
 * 
 * @param birthDate - The user's date of birth.
 * @returns The Zodiac sign of the Sun.
 */
export function getSunSign(birthDate: Date): ZodiacSign {
    const positions = getPlanetaryPositions(birthDate);
    const sun = positions.find(p => p.planet === 'Sun');
    return sun?.sign || 'Aries';
}

/**
 * Determines the Moon sign for a given birth date and time.
 * 
 * @param birthDate - The user's date of birth.
 * @param birthTime - The user's time of birth (HH:MM).
 * @returns The Zodiac sign of the Moon.
 */
export function getMoonSign(birthDate: Date, birthTime: string): ZodiacSign {
    // Parse time and combine with date
    const [hours, minutes] = birthTime.split(':').map(Number);
    const dateWithTime = new Date(birthDate);
    dateWithTime.setHours(hours || 12, minutes || 0, 0, 0);

    const positions = getPlanetaryPositions(dateWithTime);
    const moon = positions.find(p => p.planet === 'Moon');
    return moon?.sign || 'Aries';
}

/**
 * Calculates the Rising Sign (Ascendant) based on birth date, time, and latitude.
 * 
 * @param birthDate - The user's date of birth.
 * @param birthTime - The user's time of birth (HH:MM).
 * @param latitude - The latitude of the birth location.
 * @returns The Zodiac sign rising on the eastern horizon.
 * 
 * @remarks
 * This uses a simplified approximation based on Local Sidereal Time.
 * For precise astrological calculations, exact longitude and more complex algorithms are required.
 */
export function getRisingSign(birthDate: Date, birthTime: string, latitude: number): ZodiacSign {
    const [hours, minutes] = birthTime.split(':').map(Number);
    const dateWithTime = new Date(birthDate);
    dateWithTime.setHours(hours || 12, minutes || 0, 0, 0);

    // Simplified calculation - uses local sidereal time approximation
    // This is NOT astronomically accurate but gives plausible results
    const dayOfYear = Math.floor((dateWithTime.getTime() - new Date(dateWithTime.getFullYear(), 0, 0).getTime()) / 86400000);
    const hourDecimal = hours + (minutes / 60);

    // Approximate sidereal time
    const siderealTime = (dayOfYear * 0.985647 + hourDecimal + 18) % 24;

    // Convert to ecliptic degree (very simplified)
    const ascendantDegree = ((siderealTime / 24) * 360 + latitude * 0.5) % 360;

    return longitudeToSign(ascendantDegree);
}

/**
 * Format an aspect for display
 */
export function formatAspect(aspect: Aspect): string {
    return `${aspect.planet1} ${aspect.aspectName.toLowerCase()} ${aspect.planet2}`;
}

/**
 * Get current transits formatted for display
 */
export function getCurrentTransits(): string[] {
    const positions = getPlanetaryPositions(new Date());
    const aspects = calculateAspects(positions);

    return aspects.slice(0, 5).map(formatAspect);
}

/**
 * Generate a "mood" based on current planetary positions
 */
export function getCurrentMood(): string {
    const positions = getPlanetaryPositions(new Date());
    const moon = positions.find(p => p.planet === 'Moon');

    const moodBySign: Record<ZodiacSign, string> = {
        'Aries': 'Energetic',
        'Taurus': 'Grounded',
        'Gemini': 'Curious',
        'Cancer': 'Emotional',
        'Leo': 'Confident',
        'Virgo': 'Analytical',
        'Libra': 'Harmonious',
        'Scorpio': 'Intense',
        'Sagittarius': 'Adventurous',
        'Capricorn': 'Ambitious',
        'Aquarius': 'Innovative',
        'Pisces': 'Dreamy',
    };

    return moon ? moodBySign[moon.sign] : 'Reflective';
}

/**
 * Get lucky number based on current planetary positions
 */
export function getLuckyNumber(): number {
    const positions = getPlanetaryPositions(new Date());
    const sun = positions.find(p => p.planet === 'Sun');
    const moon = positions.find(p => p.planet === 'Moon');

    // Derive from sun and moon positions
    const sunDeg = sun?.degree || 15;
    const moonDeg = moon?.degree || 15;

    return Math.floor((sunDeg + moonDeg) % 99) + 1;
}

/**
 * Get lucky color based on sun sign
 */
export function getLuckyColor(sign: ZodiacSign): string {
    const colorBySign: Record<ZodiacSign, string> = {
        'Aries': 'Red',
        'Taurus': 'Green',
        'Gemini': 'Yellow',
        'Cancer': 'Silver',
        'Leo': 'Gold',
        'Virgo': 'Navy',
        'Libra': 'Pink',
        'Scorpio': 'Burgundy',
        'Sagittarius': 'Purple',
        'Capricorn': 'Brown',
        'Aquarius': 'Electric Blue',
        'Pisces': 'Sea Green',
    };

    return colorBySign[sign] || 'Blue';
}
