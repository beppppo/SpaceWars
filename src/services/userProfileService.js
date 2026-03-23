import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

export async function createUserProfileIfNotExists(user) {
  if (!user?.uid) {
    console.warn('[profile] Missing user uid, skipping profile creation');
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  console.log('[profile] Checking profile document for uid:', user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    console.log('[profile] Profile already exists for uid:', user.uid);
    return;
  }

  await setDoc(userRef, {
    username: user.displayName || 'Player',
    photoURL: user.photoURL || null,
    bestTime: 0,
    wins: 0,
    totalKills: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log('[profile] Created profile for uid:', user.uid);
}
