# Overview

This is a food pantry finder application built for the Second Harvest Food Bank of the Lehigh Valley. The system provides a public-facing map and directory for finding local food pantries, along with an administrative interface for managing pantry data. The application features a React frontend with an interactive map interface, Express.js backend API, and PostgreSQL database with Drizzle ORM for data management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: Shadcn/ui components with Radix UI primitives and Tailwind CSS for styling
- **Routing**: Wouter for client-side routing with conditional rendering based on authentication
- **State Management**: TanStack Query for server state and API caching
- **Mapping**: React Leaflet for interactive map functionality with OpenStreetMap tiles
- **Authentication Flow**: Conditional routing that shows landing page for unauthenticated users and main app for authenticated users

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: Replit's OpenID Connect (OIDC) authentication system with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **API Design**: RESTful endpoints with structured error handling and request logging middleware

## Database Schema
- **Users Table**: Stores user authentication data (required for Replit Auth)
- **Sessions Table**: Handles session persistence for authentication
- **Pantries Table**: Core entity storing food pantry information including location, contact details, and operational data
- **Admin Settings**: Global application configuration
- **Data Sync Settings**: Configuration for external data synchronization

## Data Layer Design
- **Storage Interface**: Abstract IStorage interface defining all database operations
- **Database Implementation**: Concrete DatabaseStorage class implementing the interface with Drizzle ORM
- **Type Safety**: Full TypeScript integration with Drizzle schema definitions and Zod validation

# External Dependencies

## Database and Hosting
- **Neon Database**: Serverless PostgreSQL database with WebSocket support for connection pooling
- **Replit Infrastructure**: Hosting platform with integrated authentication and development environment

## Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Passport.js**: Authentication middleware for Express.js integration

## Mapping and Geocoding
- **Leaflet**: Open-source mapping library for interactive maps
- **OpenStreetMap**: Tile service for map rendering
- **Nominatim API**: OpenStreetMap's geocoding service for address search and location lookup

## UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Static type checking for enhanced development experience