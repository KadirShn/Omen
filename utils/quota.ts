import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const checkAndIncrementQuota = async (userId: string, isDeveloper: boolean): Promise<boolean> => {
  if (isDeveloper) return true; // Developer'lar için kota limiti yok (Kural 4)

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;

    const data = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    
    let currentRequests = data.requestsToday || 0;
    let lastDate = data.lastRequestDate;

    // Gün değişmişse kotayı sıfırla
    if (lastDate !== today) {
      currentRequests = 0; 
      lastDate = today;
    }

    if (currentRequests >= 3) {
      return false; // Limit aşıldı
    }

    // Hakkı 1 düş (requestsToday'i artır)
    await updateDoc(userRef, {
      requestsToday: currentRequests + 1,
      lastRequestDate: today,
    });

    return true;
  } catch (error) {
    console.error("Kota güncellenirken hata:", error);
    return false; // Güvenlik için hata durumunda izin verme
  }
};

export const getRemainingQuota = async (userId: string, isDeveloper: boolean): Promise<number> => {
  if (isDeveloper) return 999; // Developer için sonsuz
  
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return 3;

    const data = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    
    if (data.lastRequestDate !== today) {
      return 3; // Bugün hiç istek atmadıysa 3 hak
    }
    
    return Math.max(0, 3 - (data.requestsToday || 0));
  } catch (error) {
    console.error("Kota çekilirken hata:", error);
    return 0;
  }
}
