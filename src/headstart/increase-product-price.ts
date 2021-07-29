import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { PriceSchedule, Product, User } from 'ordercloud-javascript-sdk';

async function run() {
  // CONFIGURATION -- CHANGE ENVIRONMENTS HERE
  /***/ const creds = config.test.SEB.Admin;
  /***/ const OCENV = 'Staging';
  /***/ const supplierID = '';
  /* Should be 1 + a decimal to increase by.  Increase by 3%? Use 1.03 */
  /***/ const amountToIncrease = 1;
  // CONFIGURATION -- CHANGE ENVIRONMENTS HERE

  const adminSdk = await helpers.ocClient(
    creds.clientID,
    creds.clientSecret,
    OCENV
  );
  const supplierSdk = await helpers.ocClient(
    creds.clientID,
    creds.clientSecret,
    OCENV
  );

  type TokenDictionary = Record<string, string>;
  const supplierTokens: TokenDictionary = {};

  console.log('getting products...');
  const products = await helpers.listAll<Product>(adminSdk.Products.List, {
    filters: { OwnerID: supplierID },
  });
  console.log('Got all products');
  const total = products.length;
  console.log(`Found ${total} products`);

  const priceScheduleReqs = products
    ?.map(p => p.ID)
    .map(id => adminSdk.PriceSchedules.Get(id!));
  const priceSchedules = await Promise.all(priceScheduleReqs).then(val => val);
  const totalPs = priceSchedules.length;
  console.log(priceScheduleReqs);
  let progress = 0;
  const errors = {};

  async function authAsSupplier(supplierID: string): Promise<string> {
    var supplierToken = supplierTokens[supplierID];
    console.log(supplierToken);
    if (supplierToken) {
      return supplierToken;
    } else {
      var newUser = await createSupplierUser(supplierID);
      var token = await supplierSdk.Auth.Login(
        newUser.Username,
        newUser.Password!,
        creds.supplierClientID,
        ['ProductAdmin', 'PriceScheduleAdmin']
      );
      supplierTokens[supplierID] = token.access_token;
      return token.access_token;
    }
  }

  async function createSupplierUser(id: string): Promise<any> {
    var user: User = {
      ID: `dsteinmetz${id}`,
      Username: `dsteinmetz${id}`,
      FirstName: 'DJ',
      LastName: 'Steinmetz',
      Email: 'dsteinmetz@four51.com',
      Password: 'fails345',
      Active: true,
    };
    var newUser = await adminSdk.SupplierUsers.Save(id, user.ID!, user);
    await adminSdk.SecurityProfiles.SaveAssignment({
      SupplierID: id,
      UserID: newUser.ID,
      SecurityProfileID: 'MPProductAdmin',
    });
    newUser.Password = user.Password!;
    return newUser;
  }

  console.log(`Patching ${totalPs} priceSchedules.`);

  await helpers.batchOperations(
    priceSchedules,
    async function singleOperation(priceSchedule: PriceSchedule): Promise<any> {
      try {
        if (priceSchedule?.PriceBreaks?.[0]?.Price !== 0) {
          const supplierToken = await authAsSupplier(supplierID!);
          // First patch PriceBreaks to null, then replace with new value
          const patch: Partial<PriceSchedule> = {
            PriceBreaks: [
              {
                Quantity: 1,
                Price:
                  priceSchedule?.PriceBreaks?.[0]?.Price! * amountToIncrease,
              },
            ],
          };
          progress++;
          console.log(`FAKE Patching ${progress} of ${totalPs}`);
          console.log(patch);
          await supplierSdk.PriceSchedules.Patch(priceSchedule.ID!, patch, {
            accessToken: supplierToken,
          });
        }
      } catch (e) {
        console.log('error');
        errors[priceSchedule.ID!] = e;
      }
    }
  );
  await helpers.log(errors);
  helpers.log(errors, 'seb-patch-errors');
  console.log('done');
}
run();
