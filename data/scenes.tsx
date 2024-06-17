import PortalItem from "@arcgis/core/portal/PortalItem";

const SCENES = new Map(
  [
    ["50bde63b675844679cb627864216e9db", {
      portalItemId: "50bde63b675844679cb627864216e9db",
      title: 'St. Gallen, Switzerland',
      description: "Some preliminary description filler text",
      item: new PortalItem({
        id: "50bde63b675844679cb627864216e9db"
      }),
    }],
    ["8208c8f77e5a4a1383a749aa25189360", {
      portalItemId: "8208c8f77e5a4a1383a749aa25189360",
      title: "Vigo, Spain",
      description: "Some preliminary description filler text",
      item: new PortalItem({
        id: "8208c8f77e5a4a1383a749aa25189360"
      }),
    }
    ]
  ]);

export default SCENES;

