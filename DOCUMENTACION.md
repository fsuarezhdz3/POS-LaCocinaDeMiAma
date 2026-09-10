# 📘 Documentación Técnica y Guía de Desarrollo - Sistema POS "La Cocina"

Esta documentación contiene la arquitectura completa del sistema, los flujos de datos principales, el modelo de base de datos y la guía paso a paso para realizar modificaciones o agregar nuevas funcionalidades.

---

## 📑 Tabla de Contenidos
1. [Arquitectura General](#1-arquitectura-general)
2. [Estructura del Proyecto y Archivos Clave](#2-estructura-del-proyecto-y-archivos-clave)
3. [Modelo de Datos y Base de Datos (MySQL)](#3-modelo-de-datos-y-base-de-datos-mysql)
4. [Flujo Detallado de una Orden / Pedido](#4-flujo-detallado-de-una-orden--pedido)
5. [Roles y Permisos del Sistema](#5-roles-y-permisos-del-sistema)
6. [Guía para Desarrolladores (Cómo Realizar Modificaciones)](#6-guía-para-desarrolladores-cómo-realizar-modificaciones)

---

## 1. Arquitectura General

El sistema sigue una arquitectura **Cliente-Servidor (Decoupled REST API)**:

```
┌────────────────────────────────────────────────────────┐
│             FRONTEND (React Native / Expo)             │
│  - Web (PC/Laptop)  - Móvil (Android/iOS / Expo Go)  │
│  - AuthContext (JWT) - MeseroContext (Borrador Orden)  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (fetch / JSON)
┌──────────────────────────▼─────────────────────────────┐
│               BACKEND (Node.js + Express)              │
│  - Express Controllers & Routes                        │
│  - JWT Middleware (authMiddleware)                     │
│  - Connection Pool (mysql2/promise)                    │
└──────────────────────────┬─────────────────────────────┘
                           │ SQL Queries
┌──────────────────────────▼─────────────────────────────┐
│                 BASE DE DATOS (MySQL)                  │
│  - DB: lacocinademiama                                 │
└────────────────────────────────────────────────────────┘
```

- **Sincronización en Tiempo Real**: Las pantallas del mesero, cocina, comal, barra y administración sincronizan datos mediante sondeo periódico (*polling*) automático en `useEffect` invocando los endpoints REST.
- **Persistencia de Sesión**: Los tokens JWT y datos de usuario se almacenan en `AsyncStorage` / `localStorage` a través del contexto global `AuthContext`.

---

## 2. Estructura del Proyecto y Archivos Clave

### 📂 Backend (`/backend`)
- **`src/server.js`**: Punto de entrada del servidor Express. Inicializa middlewares globales (CORS, JSON Parser) y monta las rutas.
- **`src/config/db.js`**: Configuración del *Pool de Conexiones* MySQL usando `mysql2/promise`.
- **`src/routes/`**:
  - `authRoutes.js`: Rutas de inicio de sesión (`/api/auth/login`).
  - `alimentosRoutes.js`: CRUD de platillos y menú del día (`/api/alimentos`).
  - `pedidosRoutes.js`: Levantamiento, actualización de estatus y cancelación de comandas (`/api/pedidos`).
  - `cortesRoutes.js`: Generación e historial de cortes de caja (`/api/cortes`).
  - `superadminRoutes.js`: Gestión de usuarios y reportes globales (`/api/superadmin`).
- **`src/controllers/`**: Contiene la lógica de negocio y las consultas SQL de cada módulo.
- **`schema.sql`**: Script SQL para crear las tablas e insertar datos iniciales.

### 📂 Frontend (`/frontend`)
- **`src/config/api.js`**: Define la URL base del backend (`API_URL`).
- **`src/context/AuthContext.js`**: Maneja el estado de inicio de sesión, token JWT y datos del usuario.
- **`src/context/MeseroContext.js`**: Almacena el borrador de la comanda activa del mesero por mesa/cliente.
- **`src/screens/`**:
  - `LoginScreen.js`: Pantalla de login universal.
  - `HomeScreen.js`: Enrutador dinámico que redirige según el rol del usuario autenticado.
  - `mesero/`: Vistas de selección de platillos (`ComidaView.js`, `DesayunosView.js`, `AntojitosView.js`, `BebidasView.js`, etc.), modales de paquete (`FormularioDesayunoModal.js`) y pestañas (`MesasTab.js`, `MenuTab.js`, `OrdenesTab.js`).
  - `cocina/CocinaHomeScreen.js`: Monitor de preparación para platillos de **Cocina**.
  - `comal/ComalHomeScreen.js`: Monitor de preparación para antjitos/guisados del **Comal**.
  - `barra/BarraHomeScreen.js`: Monitor de preparación para bebidas/despacho de **Barra**.
  - `admin/AdminHomeScreen.js`: Panel de caja, menú del día, cobros e impresión de tickets.
  - `superadmin/SuperAdminHomeScreen.js`: Panel de gestión de usuarios, catálogo completo y ventas.
- **`src/services/ticketService.js`**: Generación y formateo de tickets para impresión.

---

## 3. Modelo de Datos y Base de Datos (MySQL)

### Tablas Principales:

1. **`alimentos`**:
   - `id`: INT (PK, Auto-increment)
   - `nombre`: VARCHAR(100)
   - `tipo`: ENUM/VARCHAR ('Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postre', 'Torta', 'Extra')
   - `precio`: DECIMAL(10,2) (Precio regular)
   - `precio_paquete`: DECIMAL(10,2) (Precio especial si aplica en paquete)
   - `precio_antojito`: DECIMAL(10,2) (Precio especial en antojitos)
   - `zona`: ENUM ('cocina', 'comal', 'barra')
   - `estado`: TINYINT (1: Disponible, 0: Agotado)
   - `aplica_paquete`: TINYINT (1: Aplica para paquetes de bebida/litro, 0: No)
   - `aplica_paquete_antojito`: TINYINT (1: Aplica como guisado para antojitos, 0: No)

2. **`usuarios`**:
   - `id`: INT (PK)
   - `nombre`: VARCHAR(50) (Nombre de usuario para login)
   - `contrasena`: VARCHAR(255) (Hash Bcrypt)
   - `tipo`: ENUM ('mesero', 'admin', 'barra', 'cocina', 'comal', 'superadmin')
   - `bloqueo`: TINYINT (0: Activo, 1: Bloqueado)

3. **`pedidos`**:
   - `id`: INT (PK)
   - `mesa`: VARCHAR(50)
   - `cliente`: VARCHAR(100)
   - `estatus`: ENUM ('pendiente', 'listo', 'pagado', 'cancelado')
   - `total`: DECIMAL(10,2)
   - `mesero_id`: INT (FK a usuarios)
   - `creado_en`: DATETIME

4. **`detalle_pedidos`**:
   - `id`: INT (PK)
   - `pedido_id`: INT (FK a pedidos)
   - `alimento_id`: INT (FK a alimentos)
   - `nombre`: VARCHAR(100)
   - `cantidad`: INT
   - `precio_unitario`: DECIMAL(10,2)
   - `subtotal`: DECIMAL(10,2)
   - `comentario`: TEXT (Modificadores como "sin cebolla", "salsa verde", etc.)
   - `zona`: ENUM ('cocina', 'comal', 'barra')
   - `estatus_item`: ENUM ('pendiente', 'listo', 'cancelado')

---

## 4. Flujo Detallado de una Orden / Pedido

```
[Mesero] ──(1) Selecciona Mesa & Platillos──> [MeseroContext] (Guardado Local)
   │
   ├──(2) Presiona "Enviar Pedido" ──> POST /api/pedidos
   │                                         │
   │                                         ├──(3) Guarda en DB (pedidos & detalle_pedidos)
   │                                         │
   ▼                                         ▼
[Monitor Mesero]                     [Ruteo por Zona]
 (Muestra estatus de orden)         ├── zona = 'cocina' ──> [CocinaHomeScreen]
                                     ├── zona = 'comal'  ──> [ComalHomeScreen]
                                     └── zona = 'barra'  ──> [BarraHomeScreen]
                                               │
                                               └──(4) Marcar "Listo" ──> PUT /api/pedidos/items/:id
                                                         │
                                                         ▼
                                               [AdminHomeScreen]
                                                ├──(5) Cobrar Cuenta ──> PUT /api/pedidos/:id (pagado)
                                                └──(6) Genera Ticket & Registro en Corte de Caja
```

---

## 5. Roles y Permisos del Sistema

- 🟢 **Mesero**: Crea comandas, selecciona mesas, agrega comentarios/opciones y consulta el avance de los platillos.
- 👨‍🍳 **Cocina**: Visualiza en tiempo real los platillos en cola de la zona `cocina` y los marca como listos.
- 🫓 **Comal**: Visualiza en tiempo real antojitos y guisados de la zona `comal`.
- 🥤 **Barra**: Visualiza bebidas, postres y litros de la zona `barra`.
- 👔 **Admin**: Administra el Menú del Día, realiza edición masiva de precios, cobra cuentas, imprime tickets y efectúa cortes de caja.
- ⚡ **SuperAdmin**: Acceso absoluto: gestión CRUD de cuentas de usuario, catálogo general de platillos y estadísticas de ventas.

---

## 6. Guía para Desarrolladores (Cómo Realizar Modificaciones)

### ❓ Caso 1: Agregar un nuevo Tipo / Categoría de Alimento (Ejemplo: "Sopas")
1. **Base de Datos**: Si deseas restringir tipos por ENUM en MySQL, actualiza la columna `tipo` en la tabla `alimentos`.
2. **Frontend - Admin & SuperAdmin**:
   - En `AdminHomeScreen.js` y `SuperAdminHomeScreen.js`, agrega `'Sopas'` al arreglo de opciones de categoría en el modal del alimento:
     ```javascript
     ['Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postre', 'Torta', 'Extra', 'Sopas']
     ```
3. **Frontend - Mesero**:
   - En `frontend/src/screens/mesero/MenuTab.js`, añade el botón o pestaña para la nueva categoría.
   - Crea un componente `SopasView.js` en `frontend/src/screens/mesero/` (puedes basarte en `EntradasView.js`).

---

### ❓ Caso 2: Modificar o Agregar Campos a los Alimentos (Ejemplo: `codigo_barras`)
1. **MySQL**:
   ```sql
   ALTER TABLE alimentos ADD COLUMN codigo_barras VARCHAR(50) DEFAULT NULL;
   ```
2. **Backend**:
   - En `backend/src/controllers/alimentosController.js`, actualiza `crearAlimento` y `editarAlimento` para recibir y guardar `codigo_barras` en la consulta SQL.
3. **Frontend**:
   - En `AdminHomeScreen.js` y `SuperAdminHomeScreen.js`:
     - Agrega la variable de estado `const [formCodigoBarras, setFormCodigoBarras] = useState('');`.
     - Agrega el `<TextInput>` correspondiente dentro del modal.
     - Incluye `codigo_barras` en el objeto `payload`.

---

### ❓ Caso 3: Cambiar la Dirección IP o Puerto del Servidor Backend
- En el frontend, edita el archivo `frontend/src/config/api.js`:
  ```javascript
  export const API_URL = 'http://TU_NUEVA_IP:3000/api';
  ```

---

### ❓ Caso 4: Agregar un Nuevo Rol de Usuario (Ejemplo: "Cajero")
1. **Backend**:
   - En `authController.js` y `superadminController.js`, agrega `'cajero'` a los roles permitidos.
2. **Frontend**:
   - En `SuperAdminHomeScreen.js`, añade `'cajero'` a la cuadrícula de selección de roles en el modal de cuentas.
   - En `HomeScreen.js`, agrega el caso para redirigir al usuario con rol `cajero` a su vista correspondiente.
