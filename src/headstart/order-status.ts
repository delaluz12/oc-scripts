import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Order, LineItem } from 'ordercloud-javascript-sdk';

async function findMismatchedLineItemAndOrderStatuses() {
    const creds = config.test.SEB.Admin;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');

    const orderDirection = "Incoming";
    console.log("getting outgoing orders by status...")
    let orders: Order<any, any, any>[] = [];
    try {
        orders = await helpers.listAll<Order>(sdk.Orders.List, orderDirection, {filters: {"xp.SubmittedOrderStatus": "Open", "Status": "Completed"}});
    } catch (e) {
        console.log(e)
    }
    console.log("Got all outgoing orders")

    const total = orders.length;

    console.log(`Found ${total} outgoing orders.`)

    let progress = 1;
    let liProgress = 1;
    const errors = {};
    console.log(`Patch orders`)
    await helpers.batchOperations(orders, async function singleOperation(
        order: Order
        ): Promise<any> {
        const patch: Partial<Order> = {
            Status: "Completed",
            xp: {
                ShippingStatus: "Shipped",
                SubmittedOrderStatus: "Completed"
            }
        }
        try {
            // await sdk.Orders.Patch(orderDirection, order.ID!, patch);
            console.log(`Patched ${progress} out of ${total}`);
            progress++;
        } catch (e) {
            console.log("error")
            errors[order.ID!] = e;
        }
        console.log(`Get all line items for the order, and make sure their stuff is in order`);
        let lineItems: LineItem[] = [];
        try {
            lineItems = await helpers.listAll<LineItem>(sdk.LineItems.List, "Incoming", order.ID!);
        } catch (e) {
            console.log(e)
        }
        const totalLi = lineItems.length;
        console.log(`Found ${totalLi} line items`);
        await helpers.batchOperations(lineItems, async function singleOperation(
            lineItem: LineItem
        ): Promise<any> {
            const patch: Partial<LineItem> = {
                xp: {
                    LineItemStatus: "Complete",
                    StatusByQuantity: {
                        Submitted: lineItem.QuantityShipped 
                    }
                }
            }
            try {
                // await sdk.LineItems.Patch(orderDirection, order.ID!, lineItem.ID!, patch);
                console.log(`Patched ${liProgress} out of ${totalLi}`);
                liProgress++
            } catch (e) {
                console.log(e);
                errors[lineItem.ID!] = e;
            };
        });
    })

    console.log(`Finished patching orders and line items`);
    console.log("Done");
}
findMismatchedLineItemAndOrderStatuses();