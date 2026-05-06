import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_DAILY_REQUESTS = 3;
const STORAGE_KEY = '@omen_daily_usage';

interface UsageData {
  date: string;
  count: number;
}

const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const getRemainingRequests = async (): Promise<number> => {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);
    const today = getTodayString();
    
    if (rawData) {
      const data: UsageData = JSON.parse(rawData);
      
      // Geçmiş bir günse kotayı sıfırla
      if (data.date !== today) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
        return MAX_DAILY_REQUESTS;
      }
      
      // Bugün ise kalan hakkı dön (minimum 0)
      return Math.max(0, MAX_DAILY_REQUESTS - data.count);
    }
    
    // Veri hiç yoksa, bugün için ilk defa kaydet ve tam kota ver
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
    return MAX_DAILY_REQUESTS;
  } catch (error) {
    console.error('Error fetching usage data:', error);
    // Storage çöküşünde fallback olarak 1 hak ver (hata sebebiyle block olmasın)
    return 1; 
  }
};

export const incrementRequestCount = async (): Promise<number> => {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);
    const today = getTodayString();
    
    let newCount = 1;
    if (rawData) {
      const data: UsageData = JSON.parse(rawData);
      if (data.date === today) {
        newCount = data.count + 1;
      }
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    return Math.max(0, MAX_DAILY_REQUESTS - newCount);
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    return 0; // Increment hata verdiyse 0 dön ki spamlara karşı kilitlesin
  }
};
