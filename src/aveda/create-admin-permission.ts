import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 *  Pull in ug from an excel file, and patch the xp property
 */

async function run() {
  const creds = config.prod.aveda;
  const sdk = await helpers.ocClient(
    creds.clientID,
    creds.clientSecret,
    'Production'
  );
  const buyerID =
    creds.clientID === config.test.aveda.clientID ? 'avedatest' : 'aveda';

  // security profiles that can need  OC  Custom Roles
  const permissionWithCustomRole = [
    {
      ID: 'AvedaProductsAdmin',
      Name: 'Aveda Products Admin',
      Description: 'Ability to CRUD  Products',
      Roles: [
        'ProductAdmin',
        'ProductAssignmentAdmin',
        'ProductReader',
        'CategoryAdmin',
        'CategoryReader',
      ],
      CustomRoles: ['AvedaProductsAdmin'],
    },
    {
      ID: 'LaunchControlAdmin',
      Name: 'Launch Control Admin',
      Description: 'Ability to CRUD Launch',
      Roles: [
        'OrderAdmin',
        'OrderReader',
        'ProductReader',
        'BuyerReader',
        'BuyerAdmin',
        'CategoryAdmin',
        'CategoryReader',
      ],
      CustomRoles: ['LaunchControlAdmin'],
    },
    {
      ID: 'AvedaNewsAdmin',
      Name: 'Aveda News Admin',
      Description: 'Ability to CRUD Aveda News',
      Roles: [],
      CustomRoles: ['AvedaNewsAdmin'],
    },
    {
      ID: 'UrgentUpdatesAdmin',
      Name: 'Urget Updates Admin',
      Description: 'Ability to CRUD Urget Updates',
      Roles: [],
      CustomRoles: ['UrgentUpdatesAdmin'],
    },

    {
      ID: 'InternalUserAdmin',
      Name: 'Internal Users Admin',
      Description: 'Ability to CRUD Internal Users Admin',
      Roles: [
        'UserGroupAdmin',
        'UserGroupReader',
        'BuyerUserReader',
        'BuyerUserAdmin',
      ],
      CustomRoles: ['InternalUserAdmin'],
    },
    {
      ID: 'ReportsAdmin',
      Name: 'Report Admin',
      Description: 'Ability to access Reports Admin',
      Roles: [
        'CreditCardReader',
        'CreditCardAdmin',
        'UserGroupReader',
        'BuyerUserReader',
        'BuyerUserAdmin',
      ],
      CustomRoles: ['ReportsAdmin'],
    },
    {
      ID: 'ClaimsCategoriesAdmin',
      Name: 'Claims Categories Admin',
      Description: 'Ability to CRUD Claims Categories Admin',
      Roles: [],
      CustomRoles: ['ClaimsCategoriesAdmin'],
    },
    {
      ID: 'ResubmitOrdersAdmin',
      Name: 'Resubmit Orders Admin',
      Description: 'Ability to CRUD Resubmit Orders Admin',
      Roles: ['OrderReader', 'OrderAdmin', 'UnsubmittedOrderReader'],
      CustomRoles: ['ResubmitOrdersAdmin'],
    },
    {
      ID: 'DiagnosticToolAdmin',
      Name: 'Diagnostic Tool Admin',
      Description: 'Ability to Access Diagnostic Tool Admin',
      Roles: [
        'OrderReader',
        'OrderAdmin',
        'UnsubmittedOrderReader',
        'UserGroupAdmin',
        'UserGroupReader',
        'CreditCardReader',
        'CreditCardAdmin',
      ],
      CustomRoles: ['DiagnosticToolAdmin'],
    },
    {
      ID: 'MiscellaneousAdmin',
      Name: 'Miscellaneous Admin',
      Description: 'Ability to acess Miscellaneous Admin',
      Roles: ['BuyerReader', 'BuyerAdmin', 'CategoryReader', 'CategoryReader'],
      CustomRoles: ['MiscellaneousAdmin'],
    },
    {
      ID: 'AvedaCategoryAdmin',
      Name: 'Category Admin',
      Description: 'Ability to CRUD admin categories',
      Roles: [
        'CategoryAdmin',
        'CategoryReader',
        'ProductAdmin',
        'ProductAssignmentAdmin',
        'ProductReader',
        'UserGroupAdmin',
        'UserGroupReader',
      ],
      CustomRoles: ['AvedaCategoryAdmin'],
    },

    {
      ID: 'PromotionProductAdmin',
      Name: 'Promotion Product Admin',
      Description: 'Ability to CRUD promotions',
      Roles: [
        'PromotionAdmin',
        'PromotionReader',
        'ProductReader',
        'UserGroupReader',
      ],
      CustomRoles: ['PromotionProductAdmin'],
    },
    {
      ID: 'PromotionShippingAdmin',
      Name: 'Promotion Shipping Admin',
      Description: 'Ability to CRUD promotions',
      Roles: [
        'PromotionAdmin',
        'PromotionReader',
        'ProductReader',
        'UserGroupReader',
      ],
      CustomRoles: ['PromotionShippingAdmin'],
    },
    {
      ID: 'AdminUserAdmin',
      Name: 'Admin Users Admin',
      Description: 'Ability to CRUD Admin Users',
      Roles: [
        'AdminUserAdmin',
        'AdminUserGroupAdmin',
        'AdminUserGroupReader',
        'AdminUserReader',
      ],
      CustomRoles: [],
    },

    {
      // ability to admin Approval Rules
      ID: 'ApprovalRuleAdmin',
      Name: 'Approval Rules Admin',
      Description: 'Ability to set Admin Users',
      Roles: [
        'ApprovalRuleAdmin',
        'ApprovalRuleReader',
        'UserGroupAdmin',
        'UserGroupReader',
        'BuyerUserReader',
        'BuyerUserAdmin',
      ],
      CustomRoles: [],
    },
    {
      ID: 'CostCenterAdmin',
      Name: 'Cost Center Admin',
      Description: 'Ability to CRUD Cost Centers',
      Roles: [
        'CostCenterAdmin',
        'CostCenterReader',
        'UserGroupAdmin',
        'UserGroupReader',
        'ApprovalRuleAdmin',
      ],
      CustomRoles: [],
    },
  ];

  const total = permissionWithCustomRole.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(
    permissionWithCustomRole,
    async function singleOperation(permissionInfo: any) {
      if (permissionInfo.ID) {
        try {
          progress++;
          let ug = {
            ID: permissionInfo.ID,
            Name: permissionInfo.Name,
            Description: permissionInfo.Description,
            xp: {
              IsPermission: true,
            },
          };
          await sdk.AdminUserGroups.Create(ug);
          await sdk.SecurityProfiles.Create({
            ID: permissionInfo.ID,
            Name: permissionInfo.Name,
            CustomRoles: permissionInfo.CustomRoles
              ? permissionInfo.CustomRoles
              : [],
            Roles: permissionInfo.Roles ? permissionInfo.Roles : [],
          });
          await sdk.SecurityProfiles.SaveAssignment({
            SecurityProfileID: permissionInfo.ID,
            UserGroupID: permissionInfo.ID,
          });

          console.log(`${progress} of ${total} permissions updated`);
        } catch (e) {
          if (e.isOrderCloudError) {
            errors[permissionInfo.ID] = {
              Message: e.message,
              Errors: e.errors,
            };
          } else {
            errors[permissionInfo.ID] = { Message: e.message };
          }
        }
      }
    }
  );
  helpers.log(errors, 'creating-permissions');
}

run();
//make sure
