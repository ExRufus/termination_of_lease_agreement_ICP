import {
  Canister,
  Err,
  nat64,
  Ok,
  Opt,
  Principal,
  query,
  Record,
  Result,
  StableBTreeMap,
  text,
  update,
  Variant
} from 'azle';
const BusinessOwner = Record({
  id: Principal,
  name: text
});

const Customer = Record({
  id: Principal,
  name: text
});

const RentalItem = Record({
  id: Principal,
  items: text,
  quantity: nat64
})

const Lease = Record({
  id: Principal,
  businessOwner: Principal,
  customer: Principal,
  rentalItem: Principal,
  numberOfItem: nat64,
  startTime: text,
  endTime: text
});

const LeaseError = Variant({
  BusinessOwnerNotFound: Principal,
  CustomerNotFound: Principal,
  RentalItemNotFound: Principal,
});

type LeaseError = typeof LeaseError.tsType
type BusinessOwner = typeof BusinessOwner.tsType
type Customer = typeof Customer.tsType
type RentalItem = typeof RentalItem.tsType
type Lease = typeof Lease.tsType

let BusinessOwners = StableBTreeMap<Principal, BusinessOwner>(0);
let Customers = StableBTreeMap<Principal, Customer>(1);
let RentalItems = StableBTreeMap<Principal, RentalItem>(2);
let Leases = StableBTreeMap<Principal, Lease>(3);

export default Canister({
  createBussinessOwner: update([ text ], BusinessOwner, (name) => {
    const id = generateId();
    const bussinessOwner: BusinessOwner = {
      id,
      name,
    }
    BusinessOwners.insert(id, bussinessOwner);
    return bussinessOwner;
  }),
  getBussinessOwnerId: query([Principal], Opt(BusinessOwner), (id) => {
    return BusinessOwners.get(id);
  }),
  createCustomer: update([ text ], Customer, (name) => {
    const id = generateId();
    const customers: Customer = {
      id,
      name,
    };
    Customers.insert(id, customers);
    return customers;
  }),
  getCustomerId: query([Principal], Opt(Customer), (id) => {
    return Customers.get(id);
  }),
  createRentalItems: update([ text, nat64], RentalItem, (items, quantity) => {
    const id = generateId();
    const rentalItems: RentalItem = {
      id,
      items,
      quantity
    }
    RentalItems.insert(id, rentalItems);
    return rentalItems
  }),
  getRentalItem: query([Principal], Opt(RentalItem), (id) => {
    return RentalItems.get(id);
  }),
  createLease: update(
    [Principal, Principal, Principal, nat64, text],
    Result(Lease, LeaseError),
    (businessOwnerId, customerId, rentalItemId, numberOfItem, endTime) => {
      return new Promise((resolve, reject) => {
        // Get business owner
        const businessOwnerOpt = BusinessOwners.get(businessOwnerId);
        if ('None' in businessOwnerOpt) {
          reject({
            BusinessOwnerNotFound: businessOwnerId
          });
          return;
        }
        const businessOwner = businessOwnerOpt.Some;
  
        // Get customer
        const customerOpt = Customers.get(customerId);
        if ('None' in customerOpt) {
          reject({
            CustomerNotFound: customerId
          });
          return;
        }
        const customer = customerOpt.Some;
  
        // Get rental item
        const rentalItemOpt = RentalItems.get(rentalItemId);
        if ('None' in rentalItemOpt) {
          reject({
            RentalItemNotFound: rentalItemId
          });
          return;
        }
        let rentalItem = rentalItemOpt.Some;
  
        // Reduce the number of items rented
        rentalItem = {
          ...rentalItem,
          quantity: rentalItem.quantity - numberOfItem
        };
  
        // Check that the quantity is not negative
        if (rentalItem.quantity < 0) {
          reject({
            NegativeQuantity: rentalItemId
          });
          return;
        }
  
        // Generate ID and start time
        const id = generateId();
        const startTime = new Date().toISOString();
  
        // Create lease object
        const lease: Lease = {
          id,
          businessOwner: businessOwnerId,
          customer: customerId,
          rentalItem: rentalItemId,
          numberOfItem,
          startTime,
          endTime
        };
  
        // Insert lease
        Leases.insert(id, lease);
  
        // Resolve with the lease
        resolve(Ok(lease));
      });
    }
  ),  
  getLeaseId: query([Principal], Opt(Lease), (id) => {
    return Leases.get(id);
  }),
});


function generateId(): Principal {
  const randomBytes = new Array(29)
      .fill(0)
      .map((_) => Math.floor(Math.random() * 256));

  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}