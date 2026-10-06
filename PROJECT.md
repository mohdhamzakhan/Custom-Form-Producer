# Custom-Form-Producer — Dynamic Form Builder Architecture

## Purpose
Production-line platform composed of ASP.NET Core backend, React/Vite web client and .NET MAUI application.

## Architecture
React/Vite client -> productionLine.Server API -> DTO/Controllers/Services -> Models/EF migrations -> persistence.

ProductionLineApp/ provides native/mobile production-line functionality using Views, ViewModels, Models, Services, Controls and Converters.

## Server
Controllers/, DTO/, Model/, Service/, Migrations/ and Program.cs are the key backend areas. Keep controllers thin and business rules in services.

## Client
productionline.client/ contains the web/form-builder UI. Trace form definition -> rendering -> user input -> validation -> API payload -> server persistence before changing builder behavior.

## AI Rules
Preserve existing saved-form compatibility and API contracts. For MAUI changes follow MVVM boundaries. Avoid unrelated dependency changes.

## Validation
Test both newly created forms and existing saved forms after schema/rendering changes. Build server, client and MAUI project as applicable.