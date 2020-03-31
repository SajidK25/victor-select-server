const shippo = require("shippo")(process.env.SHIPPOTEST_TOKEN);
const { validateArgument } = require("./utils");

const validateAddress = async input => {
  validateArgument(input, "input");
  validateArgument(input.addressOne, "input.addressOne");
  validateArgument(input.addressTwo, "input.addressTwo");
  validateArgument(input.city, "input.city");
  validateArgument(input.state, "input.state");
  validateArgument(input.name, "input.name");

  console.log(process.eventNames);

  let address = {};
  try {
    address = await shippo.address.create({
      name: input.name,
      street1: input.addressOne,
      street2: input.addressTwo,
      city: input.city,
      state: input.state,
      zip: input.zipcode,
      country: "US",
      phone: input.phoneNumber,
      email: input.email,
      validate: true
    });
    console.log("CreateReturn:", address);
  } catch (err) {
    console.log("createAddressError", err);
    throw new Error(err);
  }
  if (!address) {
    throw new Error("Unable to create address");
  }

  return address.validation_results.is_valid
    ? { valid: true, shippoId: address.object_id }
    : {
        valid: false,
        shippoId: "",
        errors: address.validation_results.messages
      };
};

const createShipment = async shippoAddressId => {
  console.log("AddressID", shippoAddressId);
  let shipment = "";
  try {
    const shipment = await shippo.shipment.create({
      address_to: shippoAddressId,
      address_from: {
        name: "Daily Dose Pharmacy",
        street1: "4534 Westgate Blvd.",
        street2: "",
        city: "Austin",
        state: "TX",
        zip: "78745",
        country: "US",
        phone: "9494138239",
        email: "brian@bbaker.net"
      },
      parcels: [
        {
          weight: "1",
          mass_unit: "lb",
          template: "USPS_FlatRateEnvelope"
        }
      ]
    });
    return shipment.object_id;
    console.log("Shipment:", shipment);
  } catch (err) {
    console.log("Shipment Err:", err);
  }
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
module.exports = { validateAddress, createShipment };
