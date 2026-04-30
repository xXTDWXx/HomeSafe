# ThuisVeilig

Prototype voor een veiligheidsapp waarmee iemand een route deelt met trusted contacts.

## Starten

```powershell
node server.mjs
```

Open daarna `http://localhost:4174`.

## Wat werkt nu

- Routeplanning via OpenStreetMap/Nominatim en OSRM.
- Vrije adresinvoer: typ zelf vertrekpunt en bestemming en druk op `Route berekenen`.
- Adressuggesties tijdens het typen via OpenStreetMap/Nominatim.
- Echte GPS-tracking via de browser wanneer locatietoegang beschikbaar is.
- Contact Picker API waar de browser telefooncontacten toestaat, met fallbackcontacten voor browsers zonder support.
- Afwijkingsdetectie op basis van afstand tot de route.
- Contactniveaus: vriend(in), beste vriend(in), familie en ouder/voogd.
- Rit starten met live locatie.
- Testknop om een afwijking te simuleren tijdens ontwikkeling.
- Safety-check timer met automatische escalatie.
- "Ik ben veilig" bevestiging na afwijking.
- Noodknop die alle gekoppelde contacten waarschuwt.

## Later voor echte iOS/Android release

- Capacitor of native Swift/Kotlin laag voor achtergrondlocatie, pushmeldingen en contacten.
- Accounts, toestemming per contact, uitnodigingen en server-side trip sessions.
- Eigen backend voor live locatie, route-afwijkingsdetectie en audit logging.
- Betaalde routing API of eigen routing service voor productiebetrouwbaarheid.
- HTTPS of native app-build is nodig voor betrouwbare GPS-toegang op iPhone.
- iPhone Safari ondersteunt webtoegang tot telefooncontacten niet betrouwbaar; voor iOS-productie is een native Capacitor/Swift-laag nodig.
