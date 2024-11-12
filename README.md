# City Download Portal

Built with the Arcgis Maps SDK for Javascript, React, Remix, and Tailwind CSS.

[View it live](https://gunnnnii.github.io/city-download-portal/)

![The image shows a 3D map visualization of St. Gallen, Switzerland, with buildings and trees rendered in high detail. Blue-highlighted buildings are marked with length indicators ("752.33 ft" and "772.04 ft") within a selected rectangular area outlined in red. A side panel on the right displays information about the model's origin coordinates, spatial reference, and elevation, along with export options. The interface includes controls for zooming, searching locations, and selecting areas, with export options for the 3D model file in .glb format.](https://github.com/user-attachments/assets/15cb1550-4854-4853-8a66-6a995142efcd)

## Features

- Select an area to generate a mesh with using interactive tools, or by providing your own georeferencing data
- Export your selection to a `.glb` file for consumption in other programs
- View georeferencing and measurment data about the selected area

## Instructions

To set up the project, clone the repository and install the dependencies:

```shell
git clone git@github.com:gunnnnii/city-download-portal.git
cd city-download-portal
npm install
```

This will install all the necessary dependencies required for the project.

## Requirements

- A text-editor
- A web browser with access to the internet

## Resources

- [ArcGIS Maps SDK for JavaScript - Developer documentation](https://developers.arcgis.com/javascript/latest/)
- [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
- [Remix](https://remix.run/)
- [React](https://react.dev/)
- [Tanstack Query](https://tanstack.com/query/latest)

## Development

You can develop your SPA app just like you would a normal Remix app. Start the development server with:

```shell
npm run dev
```

This will start the development server and watch for changes in your source files. Any changes you make to the source files will automatically reload the app in the browser.

## Deployment

The project can be automatically deployed to GitHub Pages using GitHub Actions. The deployment workflow is defined in `.github/workflows/build-deploy.yml`.

To deploy manually, you can build the project and host it anywhere:

```shell
npm run build
```

This will generate a `build` directory containing the production-ready files. You can then serve these files using any static site hosting service.

## Issues

Find a bug or want to request a new feature? Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing

Copyright 2024 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/Esri/quickstart-map-js/master/license.txt) file.
