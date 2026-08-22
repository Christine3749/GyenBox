# iWriter Desktop

Standalone Electron shell for `https://iwriter.gyenbox.com`. It has its own app
identity (`com.gyenbox.iwriter`), user-data directory, process and installers.
It does not import or launch GSYEN.

For local development, run the GyenBox web app first, then:

```sh
npm run iwriter-desktop:dev
```

Desktop filesystem access is capability-based: iWriter can only read or modify
files and folders explicitly selected in the native picker. Those grants persist
inside iWriter's own Electron user-data directory.
