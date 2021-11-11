import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Product, User } from 'ordercloud-javascript-sdk';

async function run() {
  // CONFIGURATION -- CHANGE ENVIRONMENTS HERE
  /***/ const creds = config.test.SEB.Admin;
  /***/ const OCENV = 'Staging';
  /***/ const offendingFacetID = ``;
  /***/ const queryVal = `*`;
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
  const queryString = `xp.Facets.${offendingFacetID}`;

  const products = await helpers.listAll<Product>(adminSdk.Products.List, {
    filters: { [queryString]: queryVal },
  });
  console.log('Got all products');

  const total = products.length;
  console.log(`Found ${products?.length} products`);
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
        ['ProductAdmin']
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

  console.log(`Patching ${total} products.`);

  console.log(`Getting and patching the offending facet itself, first`, {
    facet: offendingFacetID,
  });
  const offendingFacet = await adminSdk.ProductFacets.Get(offendingFacetID);
  offendingFacet.xp.Options = offendingFacet.xp.Options.map(o => {
    o = o.replace(/&/g, 'and');
    return o;
  });
  console.log(`Patching offending facet with new options`);
  await adminSdk.ProductFacets.Patch(offendingFacetID, {
    xp: { Options: offendingFacet.xp.Options },
  });
  console.log(`Patched facet ✓✓✓, Moving onto products`);

  await helpers.batchOperations(
    products,
    async function singleOperation(product: Product): Promise<any> {
      try {
        if (product?.xp?.Facets[offendingFacetID] !== undefined) {
          const supplierToken = await authAsSupplier(product.OwnerID!);
          let correctedFacets = product?.xp?.Facets[offendingFacetID];
          correctedFacets = correctedFacets.map((f: string) => {
            f = f.replace(/&/g, 'and');
            return f;
          });
          // First patch xp.Facets.apparel to null, then replace with original values + fixed value
          const patch: Partial<Product> = {
            xp: {
              Facets: {
                [offendingFacetID]: null,
              },
            },
          };
          const correctPatch: Partial<Product> = {
            xp: {
              Facets: {
                [offendingFacetID]: correctedFacets,
              },
            },
          };
          progress++;
          console.log(`Patching ${progress} of ${total}`);
          // Patch xp.Facets = null
          await supplierSdk.Products.Patch(product.ID!, patch, {
            accessToken: supplierToken,
          });
          // Patch xp.Facets back to the correct value, without the broken one
          await supplierSdk.Products.Patch(product.ID!, correctPatch, {
            accessToken: supplierToken,
          });
        }
      } catch (e) {
        console.log('error');
        errors[product.ID!] = e;
      }
    },
    // Number of operations to run
    200
  );
  await helpers.log(errors);
  helpers.log(errors, 'headstart-patch-errors');
  console.log('done');
}
run();
