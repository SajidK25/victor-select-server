const shippo = require("shippo")(process.env.SHIPPO_TOKEN);
const { validateArgument } = require("./utils");

const shippoDefaultCarrier = process.env.SHIPPO_USPS;
const shippoAddressFrom = process.env.SHIPPO_ADDRESSFROM;
const shippoDEfaultServiceLevel = "usps_first";

const ED_BASEWEIGHT = 2.5;
const ED_EXTRAMONTH = 0.5;
const EDWITHADDON_BASEWEIGHT = 5;
const EDWITHADDON_EXTRAMONTH = 1;

const createParcel = async (prescription) => {
  const parcel = {
    length: 12.5,
    width: 9.5,
    height: 1,
    distance_unit: "in",
    weight: 0,
    mass_unit: "oz",
  };

  switch (prescription.type) {
    case "ED":
      parcel.weight = !prescription.addon ? ED_BASEWEIGHT : EDWITHADDON_BASEWEIGHT;
      parcel.weight +=
        (!prescription.addon ? ED_EXTRAMONTH : EDWITHADDON_EXTRAMONTH) * (prescription.shippingInterval - 1);
      break;

    default:
      parcel.weight = 5;
  }

  let shippoParcel = null;
  try {
    shippoParcel = await shippo.parcel.create({
      ...parcel,
    });
  } catch (err) {
    console.log("Parcel Err:", err);
    throw new Error("Unable to create parcel");
  }

  return shippoParcel.object_id;
};

const validateAddress = async (input) => {
  validateArgument(input, "input");
  validateArgument(input.addressOne, "input.addressOne");
  validateArgument(input.addressTwo, "input.addressTwo");
  validateArgument(input.city, "input.city");
  validateArgument(input.state, "input.state");
  validateArgument(input.zipcode, "input.zipcode");
  validateArgument(input.name, "input.name");
  validateArgument(input.email, "input.email");
  validateArgument(input.telephone, "input.telephone");

  let ret = null;
  try {
    ret = await shippo.address.create({
      name: input.name,
      street1: input.addressOne,
      street2: input.addressTwo,
      city: input.city,
      state: input.state,
      zip: input.zipcode,
      country: "US",
      phone: input.telephone,
      email: input.email,
      validate: true,
    });
  } catch (err) {
    console.log("createAddressError", err);
    throw new Error("Network error validating address. Please try later.");
  }
  if (!ret || !ret.validation_results) {
    throw new Error("Network error validating address. Please try later.");
  }
  console.log("Shippo return:", ret);
  ret.validation_results.messages.forEach((m) => console.log("message", m));

  if (!ret.validation_results.is_valid) {
    return {
      valid: false,
      shippoId: "",
      errors: ret.validation_results.messages,
    };
  }

  // Get updated values
  input.addressOne = ret.street1;
  input.addressTwo = ret.street2;
  input.city = ret.city;
  input.state = ret.state;
  input.zipcode = ret.zip;
  input.telephone = ret.phone;

  return { valid: true, shippoId: ret.object_id, errors: [], input };
};

const getOrder = async (orderId) => {
  let ret = null;
  try {
    ret = await shippo.order.retrieve(orderId);
    //    ret = await shippo.order.list();
  } catch (err) {
    console.log("retrieveOrder", err);
    throw new Error(`Error retrieving order ${orderId}`);
  }
  console.log("return", ret);
  if (!ret && !ret.data) {
    throw new Error(`Couldn't find order ${orderId}`);
  }

  return ret;
};

const createShippoOrder = async (order) => {
  try {
    ret = await shippo.order.create({
      to_address: order.shippoAddressId,
      from_address: shippoAddressFrom,
      placed_at: new Date(),
      order_number: "#1068",
      order_status: "PAID",
      weight: "0.50",
      weight_unit: "lb",
    });
  } catch (err) {
    console.error("Couldn't create shippo order");
    throw new Error("Unable to create new shippo error");
  }

  console.log(ret);

  return ret;
};

// function checkBatchStatus(object_id) {
//   let result

//   shippo.batch.retrieve(object_id).then(
//     function(response) {
//       if (response.status === "VALID") {
//         //Example of adding a shipment to a batch object
//         shippo.batch.add(response.object_id, shipments).then(
//           function(addResponse) {
//             console.log(
//               "Response from adding shipments to batch: %s",
//               JSON.stringify(addResponse, null, 4)
//             );
//             //Example of removing a shipment from a batch object
//             shippo.batch
//               .remove(addResponse.object_id, [
//                 addResponse.batch_shipments.results[0].object_id
//               ])
//               .then(
//                 function(removeResponse) {
//                   console.log(
//                     "Response from removing shipments from the batch: %s",
//                     JSON.stringify(removeResponse, null, 4)
//                   );
//                   //Example of purchasing a batch shipment
//                   shippo.batch.purchase(response.object_id).then(
//                     function(purchaseResponse) {
//                       console.log(
//                         "Batch shipment purchase response: %s",
//                         JSON.stringify(purchaseResponse, null, 4)
//                       );
//                     },
//                     function(purchaseErr) {
//                       console.log(
//                         "There was an error purchasing the batch shipment: %s",
//                         purchaseErr
//                       );
//                     }
//                   );
//                 },
//                 function(removeErr) {
//                   console.log(
//                     "There was an error removing shipments from the batch: %s",
//                     removeErr
//                   );
//                 }
//               );
//           },
//           function(addErr) {
//             console.log(
//               "There was an error adding shipments to the batch: %s",
//               addErr
//             );
//           }
//         );
//       } else if (timeout < BATCH_WAIT_TIMEOUT) {
//         timeout = timeout + POLLING_INTERVAL;
//         setTimeout(checkBatchStatus, POLLING_INTERVAL, response.object_id);
//       } else {
//         console.log("Batch purchase timed out on batch %s", response.object_id);
//       }
//     },
//     function(err) {
//       console.log(
//         "There was an error retrieving the batch information: %s",
//         retrieveErr
//       );
//     }
//   );

// const createBatch = async shipments => {

// }

// const createParcel = async (package_size, weight) => {
//   let parcel = null;
//   try {
//     parcel = await shippo.parcel.create({
//       ...package_size,
//       distance_unit: "in",
//       weight: weight,
//       mass_unit: "oz",
//     });
//   } catch (err) {
//     throw new Error("Unable to create parcel");
//   }

//   if (!parcel) {
//     throw new Error("Unable to create parcel");
//   }

//   return parcel.object_id;
// };

const createBatch = async (orders) => {
  let batchShipments = [];

  const input = {
    default_carrier_account: shippoDefaultCarrier,
    default_servicelevel_token: shippoDefaultServiceLevel,
    label_filetype: "PDF_4x6",
    metadata: "",
    batch_shipments: [],
  };

  orders.forEach((o) => {
    input.batch_shipments.push({
      shipment: {
        address_to: o.addressId,
        address_from: shippoAddressFrom,
        parcels: [o.parcelId],
        carrier_account: shippoDefaultCarrier,
        servicelevel_token: shippoDefaultServiceLevel,
      },
    });
  });

  console.log("Input:", JSON.stringify(input, 0, 2));
  let batch = null;
  //return batch;

  try {
    batch = await shippo.batch.create(input);
  } catch (err) {
    console.log("Batch Error:", err);
  }

  console.log("createBatch", batch);
};

var shipments = [];
/*
const createBatch = parcel => {
  let shipment = null;
  try {
    shipment = shippo.shipment.create({});
  } catch (err) {}
};

shippo.shipment
  .create({
    address_from: addressFrom,
    address_to: addressTo,
    parcels: [parcel],
    async: false
  })
  .then(
    function(shipmentResponse) {
      console.log(
        "Shipment created with object id: %s",
        shipmentResponse.object_id
      );
      shipments.push({ shipment: shipmentResponse.object_id });
      // example of creating a batch shipment
      shippo.batch.create(myBatch).then(
        function(createResponse) {
          console.log(
            "Batch shipment creation response: %s",
            JSON.stringify(createResponse, null, 4)
          );
          //Poll a batch object to check for a VALID status before adding/removing shipments or purchasing
          checkBatchStatus(createResponse.object_id);
        },
        function(createErr) {
          console.log(
            "There was an error creating the batch shipment: %s",
            createErr
          );
        }
      );
    },
    function(shipmentErr) {
      console.log("There was an error creating a shipment: %s", shipmentErr);
    }
  );

//Using Batch::retrieve to poll for the batch's VALID status is done for demo purposes only
//In practice, it is recommended to register a Batch Create webhook for status updates
var timeout = 0;
function checkBatchStatus(object_id) {
  shippo.batch.retrieve(object_id).then(
    function(response) {
      if (response.status === "VALID") {
        //Example of adding a shipment to a batch object
        shippo.batch.add(response.object_id, shipments).then(
          function(addResponse) {
            console.log(
              "Response from adding shipments to batch: %s",
              JSON.stringify(addResponse, null, 4)
            );
            //Example of removing a shipment from a batch object
            shippo.batch
              .remove(addResponse.object_id, [
                addResponse.batch_shipments.results[0].object_id
              ])
              .then(
                function(removeResponse) {
                  console.log(
                    "Response from removing shipments from the batch: %s",
                    JSON.stringify(removeResponse, null, 4)
                  );
                  //Example of purchasing a batch shipment
                  shippo.batch.purchase(response.object_id).then(
                    function(purchaseResponse) {
                      console.log(
                        "Batch shipment purchase response: %s",
                        JSON.stringify(purchaseResponse, null, 4)
                      );
                    },
                    function(purchaseErr) {
                      console.log(
                        "There was an error purchasing the batch shipment: %s",
                        purchaseErr
                      );
                    }
                  );
                },
                function(removeErr) {
                  console.log(
                    "There was an error removing shipments from the batch: %s",
                    removeErr
                  );
                }
              );
          },
          function(addErr) {
            console.log(
              "There was an error adding shipments to the batch: %s",
              addErr
            );
          }
        );
      } else if (timeout < BATCH_WAIT_TIMEOUT) {
        timeout = timeout + POLLING_INTERVAL;
        setTimeout(checkBatchStatus, POLLING_INTERVAL, response.object_id);
      } else {
        console.log("Batch purchase timed out on batch %s", response.object_id);
      }
    },
    function(err) {
      console.log(
        "There was an error retrieving the batch information: %s",
        retrieveErr
      );
    }
  );
}
*/
module.exports = { validateAddress, createParcel, createShippoOrder, createBatch, getOrder };
