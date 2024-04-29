<script lang="ts" context="module">
	import '../app.css';
	import { FirebaseApp, SignedIn, SignedOut } from 'sveltefire';
	import { initializeApp } from 'firebase/app';
	import { getFirestore } from 'firebase/firestore';
	import { getAuth, signInAnonymously } from 'firebase/auth';
	import { getStorage } from 'firebase/storage';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import {
		PUBLIC_API_KEY,
		PUBLIC_AUTH_DOMAIN,
		PUBLIC_MESSAGING_SENDER_ID,
		PUBLIC_APP_ID,
		PUBLIC_PROJECT_ID,
		PUBLIC_STORAGE_BUCKET
	} from '$env/static/public';

	import { getDatabase } from 'firebase/database';
	import { Toaster } from 'svelte-sonner';

	const provider = new GoogleAuthProvider();
	let isLoading = false;
	// Initialize Firebase
	const firebaseConfig = {
		apiKey: PUBLIC_API_KEY,
		authDomain: PUBLIC_AUTH_DOMAIN,
		projectId: PUBLIC_PROJECT_ID,
		storageBucket: PUBLIC_STORAGE_BUCKET,
		messagingSenderId: PUBLIC_MESSAGING_SENDER_ID,
		appId: PUBLIC_APP_ID
	};

	const app = initializeApp(firebaseConfig);
	const firestore = getFirestore(app);
	const storage = getStorage(app);
	const auth = getAuth(app);
	const rtdb = getDatabase(app);
</script>

<FirebaseApp {auth} {firestore} {storage} {rtdb}>
	<slot />
	<Toaster position="top-center" richColors />
</FirebaseApp>
