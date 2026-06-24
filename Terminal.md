pc@Revo MINGW64 /h/Stellar/Stellar.vision-master/Stellar.vision-master (master)
$ npm run build

> stellar@0.0.0 build
> tsc -b && vite build

src/pages/admin/tabs/BlockedDatesTab.tsx:119:31 - error TS6133: 'date' is declared but its value is never read.

119 const handleToggle = async (date: Date, isoDate: string) => {

```

Found 1 error.

```
