# Buenas Prácticas — Aplicaciones Móviles

> El documento base no tenía una sección dedicada a móvil; este archivo **[Generado por Claude]** adapta los principios transversales (secciones 3, 4, 7, 23) al contexto móvil y agrega lo específico de iOS/Android. Léase junto con `01-Comun-Transversal.md` y `03-API-Backend.md` si consume una API.

## 1. Alcance
Apps para iOS y/o Android, nativas o multiplataforma.

## 2. Decisiones clave 🔶
- Nativo (Swift/SwiftUI en iOS, Kotlin/Jetpack Compose en Android) vs. multiplataforma (React Native, Flutter, .NET MAUI) — depende de presupuesto, necesidad de código compartido y acceso a APIs nativas específicas.
- ¿La app debe funcionar offline? → definir estrategia de sincronización y resolución de conflictos.
- Plataformas mínimas soportadas (versión mínima de iOS/Android).
- Estrategia de notificaciones push (APNs, Firebase Cloud Messaging).
- Estrategia de distribución: tiendas públicas (App Store/Google Play) vs. distribución interna (MDM, TestFlight/Play Console internal track).

### 2.1 Registro de decisiones (ADR) — obligatorio
Cada decisión anterior, una vez respondida, se registra como ADR en `docs/adr/` (proceso y plantilla en `07-ADR-Decisiones-Arquitectura.md`). Si la decisión cambia, se crea un ADR nuevo que reemplaza al anterior. ADR mínimos para una app móvil, además de los transversales:
- [ ] Nativo vs. multiplataforma (y framework elegido).
- [ ] Versiones mínimas de iOS/Android soportadas.
- [ ] Patrón de arquitectura y gestión de estado (MVVM, MVI, Clean Architecture).
- [ ] Estrategia offline-first, sincronización y resolución de conflictos.
- [ ] Proveedor y estrategia de notificaciones push.
- [ ] Almacenamiento seguro de credenciales/tokens y uso de biometría.
- [ ] Estrategia de distribución (tiendas públicas vs. distribución interna) y de actualización forzada.

## 3. Arquitectura y estado
- [ ] Patrón de arquitectura definido (MVVM, MVI, Clean Architecture) — consistente en toda la app.
- [ ] Separación de capa de UI, dominio y datos (facilita testing y portabilidad si es multiplataforma).
- [ ] Gestión de estado adecuada al framework (ViewModel + StateFlow/LiveData en Android, Combine/SwiftUI State en iOS, Redux/Zustand/Provider en RN/Flutter).

## 4. Offline-first y sincronización
- [ ] Persistencia local: SQLite, Realm, Core Data, Room, Hive, según stack.
- [ ] Cola de operaciones pendientes cuando no hay red; reintento automático al recuperar conectividad.
- [ ] Estrategia de resolución de conflictos al sincronizar con el backend (last-write-wins, versionado, merge manual).
- [ ] Indicadores claros de estado de sincronización para el usuario.

## 5. Seguridad específica móvil
- [ ] Almacenamiento seguro de tokens/credenciales: Keychain (iOS), Keystore/EncryptedSharedPreferences (Android) — nunca en `SharedPreferences`/`UserDefaults` planos.
- [ ] Autenticación biométrica (Face ID/Touch ID, biometría Android) como capa adicional cuando aplique, nunca como único factor si el dato es crítico.
- [ ] Certificate pinning para comunicaciones sensibles, si el riesgo del proyecto lo justifica.
- [ ] Ofuscación/minificación del binario en producción (ProGuard/R8 en Android) para dificultar ingeniería inversa.
- [ ] Permisos del sistema solicitados bajo principio de menor privilegio y justificados en el momento de uso (runtime permissions), no todos al inicio.

## 6. Notificaciones push
- [ ] Registro y renovación de tokens de dispositivo manejado de forma robusta (rotación, expiración).
- [ ] Payload sin datos sensibles en texto plano (el contenido de una notificación puede quedar en el centro de notificaciones del SO).
- [ ] Deep linking desde la notificación hacia la pantalla correspondiente.

## 7. UX, accesibilidad y compatibilidad de dispositivos
- [ ] Diseño responsivo para distintos tamaños de pantalla y densidades (ver doc. base, 3.8, adaptado a móvil).
- [ ] Accesibilidad: soporte de VoiceOver (iOS) / TalkBack (Android), tamaños de fuente dinámicos, contraste adecuado (ver doc. base, 3.7).
- [ ] Manejo de estados de red (sin conexión, conexión lenta) con feedback visual claro.
- [ ] Soporte de gestos estándar de la plataforma (swipe back, pull-to-refresh) según convención del SO.

## 8. Rendimiento y batería
- [ ] Minimizar wake-locks, ubicación en background y polling constante — usar push/eventos en vez de polling cuando sea posible.
- [ ] Listas largas virtualizadas (RecyclerView/LazyColumn/FlatList según stack).
- [ ] Imágenes optimizadas y cacheadas (evitar descargas repetidas).
- [ ] Medición con herramientas de profiling nativas (Android Studio Profiler, Instruments en Xcode).

## 9. Testing y CI/CD específico
- [ ] Pruebas unitarias e de integración (ver doc. base, sección 14).
- [ ] Pruebas E2E en emuladores/simuladores y al menos un set de dispositivos físicos reales (fragmentación de Android es especialmente relevante).
- [ ] Pipeline de firma y distribución automatizado (fastlane, App Center, App Store Connect API, Play Console API).
- [ ] Distribución beta antes de release público (TestFlight, Play Console internal/closed testing).

## 10. Publicación en tiendas
- [ ] Cumplimiento de guías de revisión de Apple App Store y Google Play (evitar rechazos: privacidad, permisos justificados, contenido).
- [ ] Política de privacidad publicada y enlazada, acorde a los datos realmente recolectados.
- [ ] Versionado y notas de release consistentes (semver o el esquema que use el equipo).

## 11. Monitoreo
- [ ] Crash reporting (Firebase Crashlytics, Sentry) con contexto de dispositivo/OS/versión de app.
- [ ] Analítica de uso respetando consentimiento del usuario (privacidad, GDPR/leyes locales aplicables).

## 12. Ver también
- `07-ADR-Decisiones-Arquitectura.md` (registro obligatorio de decisiones de arquitectura/diseño)
- `01-Comun-Transversal.md`
- `03-API-Backend.md` (si consume una API)
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 3, 4, 7, 23
