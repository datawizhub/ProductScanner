# ProductScanner

## Test an EAN-13 scan against Supabase

1. Copy `.env.example` to `.env.local` and fill in the project's **publishable** key. Never use a secret or service-role key in the app. Restart Expo after changing the file.
2. Run `npx expo start --lan` and open the app in Expo Go on your phone.
3. Sign in on the Login tab with an invited Prototype Store account. Successful sign-in opens the scanner on Home. Accounts and roles are assigned by an administrator; the app does not offer self-registration.
4. Scan [EAN-13 test label 5901234123457](test-assets/ean13-5901234123457.svg). It should show **EAN-13 Scan Test Item** (SKU `DEMO-EAN13`), price $0.00, and no stock recorded yet.

The scan looks up the exact barcode text within `prototype-store`. If a barcode is not in `item_barcodes`, the app shows a not-found message. Stock quantities and aisle/rack/bin appear when stock is received through the database RPCs. Signing out returns to the Login tab.

# Expo template notes

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
