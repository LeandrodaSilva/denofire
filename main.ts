import "https://deno.land/x/dotenv/load.ts";
import "https://deno.land/x/xhr@0.1.1/mod.ts";
import { installGlobals } from "https://deno.land/x/virtualstorage@0.1.0/mod.ts";
// @deno-types=https://cdn.skypack.dev/-/firebase@v9.12.1-5qvOxO9aOstWvseprBeH/dist=es2020,mode=types/index.d.ts
import firebase from "https://cdn.skypack.dev/firebase@v9.12.1/compat/app";
import "https://cdn.skypack.dev/firebase@v9.12.1/compat/auth";
import "https://cdn.skypack.dev/firebase@v9.12.1/compat/firestore";
import { virtualStorage } from "https://deno.land/x/virtualstorage@0.1.0/middleware.ts";
installGlobals();

/** A map of users that we will log in.  While this tutorial only uses one user
 * retrieved from the environment variables. It demonstrates how this can be
 * easily modified to allow different users to authenticate.
 *
 * @type {Map<string, firebase.User>} */
const users = new Map();

interface DenoFireConfig {
  accountConfig: Object<{
    apiKey: string,
    authDomain: string,
    projectId: string,
    storageBucket: string,
    messagingSenderId: string,
    appId: string
  }>,
  firestoreConfig: Object<{
    email: string,
    password: string
  }>,
}

function igniteFire(configs: DenoFireConfig) {
  const {
    accountConfig,
    firestoreConfig: { email, password },
  } = configs;

  const firebaseApp = firebase.initializeApp(accountConfig);
  const auth = firebase.auth(firebaseApp);
  const db = firebase.firestore(firebaseApp);

  const DenoFireMiddleware = async (ctx, next) => {
    const signedInUid = ctx.cookies.get("LOGGED_IN_UID");
    const signedInUser = signedInUid != null ? users.get(signedInUid) : undefined;
    if (!signedInUid || !signedInUser || !auth.currentUser) {
      const creds = await auth.signInWithEmailAndPassword(
          email,
          password,
      );
      const { user } = creds;
      if (user) {
        users.set(user.uid, user);
        ctx.cookies.set("LOGGED_IN_UID", user.uid);
      } else if (signedInUser && signedInUid.uid !== auth.currentUser?.uid) {
        await auth.updateCurrentUser(signedInUser);
      }
    }

    return next()
  }

  return {
    DenoFireConfig,
    firebase,
    auth,
    DenoFireMiddleware,
    firebaseApp,
    db,
    virtualStorage
  }
}

export default {
  igniteFire
};
