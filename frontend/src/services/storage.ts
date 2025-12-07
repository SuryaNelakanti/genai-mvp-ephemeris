import { HoroscopeData } from './api';

const DB_NAME = 'HoroscopeAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'horoscope_cache';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
}

export async function getCachedHoroscope(date: string, sign: string): Promise<HoroscopeData | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(`${date}-${sign}`);

            request.onsuccess = () => {
                resolve(request.result ? request.result.data : null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

export async function setCachedHoroscope(date: string, sign: string, data: HoroscopeData): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ id: `${date}-${sign}`, data });

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
}
