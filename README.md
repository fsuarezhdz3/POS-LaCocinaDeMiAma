# 🍽️ Sistema POS Restaurante "La Cocina"

Sistema de Punto de Venta (POS) multi-rol desarrollado para la gestión de comandas en tiempo real, control de menú del día, cortes de caja, edición masiva de precios y administración de cuentas.

📘 **[Consulta la Documentación Técnica y Guía de Desarrollo (DOCUMENTACION.md)](./DOCUMENTACION.md)** para entender el flujo completo del programa, la arquitectura y las instrucciones paso a paso para realizar modificaciones.

---

## 📋 Requisitos Previos

Para ejecutar este sistema en tu equipo local necesitas tener instalado lo siguiente:

1. **Node.js** (Versión 18 LTS o superior recomendada):
   - [Descargar Node.js](https://nodejs.org/)
2. **MySQL / XAMPP / MariaDB**:
   - Gestor de base de datos MySQL (por ejemplo vía **XAMPP Control Panel**, **WAMP**, o instalación directa de MySQL Server).
3. **Navegador Web** (Google Chrome, Edge, Firefox, Brave):
   - Para abrir la interfaz del sistema POS en PC / Laptop.
4. **Expo Go** (Opcional para teléfonos Android / iOS):
   - Aplicación instalable desde Play Store o App Store si deseas probar en dispositivos móviles.

---

## 📁 Estructura del Proyecto

```
POS/
├── backend/            # API REST (Node.js + Express + MySQL)
│   ├── src/            # Controladores, rutas y lógica del servidor
│   ├── schema.sql      # Estructura e inserciones iniciales de la Base de Datos
│   └── package.json
├── frontend/           # Aplicación cliente React Native (Expo Web / Mobile)
│   ├── src/            # Pantallas (Mesero, Admin, SuperAdmin, Cocina, etc.)
│   └── package.json
├── .gitignore          # Filtro de archivos no rastreados por Git
└── README.md           # Documentación de instalación y uso
```

---

## 🚀 Guía de Instalación y Puesta en Marcha

### Paso 1: Configurar la Base de Datos (MySQL)

1. Abre tu panel de control MySQL (por ejemplo **XAMPP** e inicia el módulo `MySQL`).
2. Entra a phpMyAdmin (`http://localhost/phpmyadmin`) o a tu cliente MySQL preferido.
3. Importa el archivo `schema.sql` ubicado en la carpeta `backend/`:
   - El script creará la base de datos `lacocinademiama` con todas sus tablas (alimentos, usuarios, pedidos, comanda, etc.) y cuentas iniciales.

---

### Paso 2: Configurar e Iniciar el Backend (Servidor API)

1. Abre una terminal y dirígete a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Verifica que exista el archivo `.env` en la carpeta `backend/` con tus credenciales de MySQL. Ejemplo de `.env`:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=lacocinademiama
   JWT_SECRET=tu_clave_secreta_jwt
   ```
4. Inicia el servidor backend:
   - **Modo Desarrollo (con auto-recarga por nodemon)**:
     ```bash
     npm run dev
     ```
   - **Modo Estándar**:
     ```bash
     npm start
     ```
   *El servidor se iniciará en `http://localhost:3000`.*

---

### Paso 3: Configurar e Iniciar el Frontend (Interfaz POS)

1. Abre otra ventana/pestaña de terminal y dirígete a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de la aplicación:
   ```bash
   npm install
   ```
3. Inicia la aplicación frontend:
   - **Para ejecutar en la Web (Navegador de Computadora / Recomendado)**:
     ```bash
     npm run web
     ```
   - **Para ejecutar con el servidor de Expo (Móvil / Web)**:
     ```bash
     npm start
     ```
   *Al ejecutar `npm run web`, Expo abrirá automáticamente la aplicación en tu navegador predeterminado (normalmente en `http://localhost:8081`).*

---

## 👥 Cuentas de Acceso (Roles)

Una vez iniciada la aplicación, podrás iniciar sesión con las cuentas por defecto registradas en la base de datos:

| Rol | Usuario | Propósito |
| :--- | :--- | :--- |
| **SuperAdmin** | Configurado en base de datos | Control total del sistema, gestión de cuentas y catálogo |
| **Admin** | Configurado en base de datos | Gestión de menú del día, cortes de caja y comanda |
| **Mesero** | Configurado en base de datos | Levantamiento de comandas y toma de pedidos |
| **Cocina / Comal / Barra** | Configurado en base de datos | Visualización y despacho de platillos por zona |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React Native, Expo, React Native Web, React Navigation, Ionicons.
- **Backend**: Node.js, Express.js, MySQL2, JWT (JSON Web Tokens), Bcryptjs.
- **Base de Datos**: MySQL / MariaDB.
