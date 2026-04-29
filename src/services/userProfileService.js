import { deleteDoc, doc, getDoc, increment, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../FirebaseConfig';

export async function createUserProfileIfNotExists(user) {
  if (!user?.uid) {
    console.warn('[profile] Missing user uid, skipping profile creation');
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const statsRef = doc(db, 'userStats', user.uid);
  const settingsRef = doc(db, 'userSettings', user.uid);
  console.log('[profile] Checking initial documents for uid:', user.uid);

  const [userSnapshot, statsSnapshot, settingsSnapshot] = await Promise.all([
    getDoc(userRef),
    getDoc(statsRef),
    getDoc(settingsRef),
  ]);

  // I create each document independently so older accounts can self-heal if one collection
  // exists and another is missing.
  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      username: user.displayName || 'Player',
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[profile] Created users/%s', user.uid);
  } else {
    console.log('[profile] users/%s already exists', user.uid);
  }

  if (!statsSnapshot.exists()) {
    await setDoc(statsRef, {
      bestTime: 0,
      wins: 0,
      totalKills: 0,
      updatedAt: serverTimestamp(),
    });
    console.log('[profile] Created userStats/%s', user.uid);
  } else {
    console.log('[profile] userStats/%s already exists', user.uid);
  }

  if (!settingsSnapshot.exists()) {
    await setDoc(settingsRef, {
      musicEnabled: true,
      sfxEnabled: true,
      updatedAt: serverTimestamp(),
    });
    console.log('[profile] Created userSettings/%s', user.uid);
  } else {
    console.log('[profile] userSettings/%s already exists', user.uid);
  }
}

// Called when a run ends to save best time, wins, and total kills in Firestore.
export async function updateUserStatsOnRunEnd(uid, survivalTimeSeconds, victoryTimeSeconds, killsThisRun = 0) {
  if (!uid) {
    return;
  }

  const statsRef = doc(db, 'userStats', uid);

  await runTransaction(db, async (transaction) => {
    // The transaction keeps bestTime / wins / totalKills consistent even if multiple writes happen close together.
    const statsSnapshot = await transaction.get(statsRef);
    const statsData = statsSnapshot.exists() ? statsSnapshot.data() : {};
    const currentBestTime = Number(statsData.bestTime) || 0;
    const currentWins = Number(statsData.wins) || 0;
    const shouldUpdateBestTime = survivalTimeSeconds > currentBestTime;
    const shouldIncrementWins = survivalTimeSeconds >= victoryTimeSeconds;
    const nextBestTime = shouldUpdateBestTime ? survivalTimeSeconds : currentBestTime;

    // This is the actual Firestore write that updates the saved game stats.
    transaction.set(
      statsRef,
      {
        bestTime: nextBestTime,
        wins: shouldIncrementWins ? currentWins + 1 : currentWins,
        totalKills: increment(killsThisRun),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function uploadUserProfilePhoto(uid, imageUri) {
  if (!uid || !imageUri) {
    throw new Error('Missing uid or image uri');
  }

  console.log('[profile] Upload starting');
  const response = await fetch(imageUri);
  const imageBlob = await response.blob();
  // One fixed file per user keeps Storage tidy and makes overwrites predictable.
  const storageRef = ref(storage, `profilePictures/${uid}.jpg`);

  await uploadBytes(storageRef, imageBlob);
  const photoURL = await getDownloadURL(storageRef);
  console.log('[profile] Upload finished');

  await updateDoc(doc(db, 'users', uid), {
    photoURL,
    updatedAt: serverTimestamp(),
  });
  console.log('[profile] Firestore photoURL updated');

  return photoURL;
}

export async function resetUserRunData(uid) {
  if (!uid) {
    throw new Error('Missing uid');
  }

  await updateDoc(doc(db, 'userStats', uid), {
    bestTime: 0,
    wins: 0,
    totalKills: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserSettings(uid) {
  if (!uid) {
    throw new Error('Missing uid');
  }

  const settingsSnapshot = await getDoc(doc(db, 'userSettings', uid));
  return settingsSnapshot.exists() ? settingsSnapshot.data() : null;
}

export async function updateUserSettings(uid, updates) {
  if (!uid) {
    throw new Error('Missing uid');
  }

  await setDoc(
    doc(db, 'userSettings', uid),
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    // Merge keeps this helper safe if we later add more settings fields.
    { merge: true }
  );
}

export async function deleteUserData(uid) {
  if (!uid) {
    throw new Error('Missing uid');
  }

  await Promise.all([
    deleteDoc(doc(db, 'users', uid)),
    deleteDoc(doc(db, 'userStats', uid)),
    deleteDoc(doc(db, 'userSettings', uid)),
  ]);
}
