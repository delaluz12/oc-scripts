import config from '../../../integration-users.config';
import * as helpers from '../../../helpers';
import { ListPage, Products, Spec, Variant, VariantSpec } from 'ordercloud-javascript-sdk';
import { filter, uniq } from 'lodash';
interface IVariantObjects {
    ProductID: string;
    Variant: Variant;
}

async function run() {
    const creds = config.seb.staging.octaneFitness
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');
    const allProducts = []; // Insert all affected productIDs here
    const allVariants: IVariantObjects[] = []

    for (var i in allProducts) {
        const variants = await helpers.listAll(sdk.Products.ListVariants, allProducts[i]);
        variants.forEach(v => allVariants.push({ ProductID: allProducts[i], Variant: v }));
    }

    // divisor
    const nonResaleDivisor = 1.06 // NON-resale products

    // stats
    let progress = 0;
    const errors = {};
    let specsToUpdate: VariantSpec[] = []
    let variantsToUpdate: IVariantObjects[] = []

    // update products
    await helpers.batchOperations(allVariants, async function singleOperation(variant): Promise<any> {
        try {
            progress++;
            // Filter out specs that don't have markups
            var filteredSpecArray: VariantSpec[] = variant.Variant.Specs?.filter(s => s.PriceMarkup != 0)!;
            filteredSpecArray = filteredSpecArray.filter(s => s.PriceMarkup != 0)
            filteredSpecArray = filteredSpecArray.filter(s => s.PriceMarkup != null)
            specsToUpdate = specsToUpdate.concat(filteredSpecArray);

            // Loop through the variants and pull out any that contain any of the OptionValues from the filteredSpecArray above
            // This will tell us what variants need to be patched
            if (variant.Variant.Specs?.some(s => s.PriceMarkup != null && s.PriceMarkup != 0)) {
                variantsToUpdate.push(variant)
            }

        } catch (e) {
            const errorID = variant.Variant.ID;
            errors[errorID!] = e;
        }
    })
    specsToUpdate = specsToUpdate.filter((spec, index, self) =>
        index === self.findIndex((t) => (
            t.OptionID === spec.OptionID && t.SpecID === spec.SpecID
        ))
    )

    // Log how many specs and variants need updating
    console.log(`There are ${specsToUpdate.length} specs with markups needing to be patched`)
    console.log(`There are ${variantsToUpdate.length} variants needing to be patched`)

    // LOG
    await helpers.log(specsToUpdate, 'specs-to-patch.json')
    await helpers.log(variantsToUpdate, 'variants-to-patch.json')

    await helpers.batchOperations(variantsToUpdate, async function singleOperation(variant): Promise<any> {
        try {
            let patchObject = variant.Variant.xp?.SpecValues.map(spec => {
                if (spec.PriceMarkup != null && spec.PriceMarkup != 0) {
                    const newMarkup = Number(spec.PriceMarkup) / nonResaleDivisor
                    return { ...spec, PriceMarkup: newMarkup }
                } else return spec
            })
            patchObject = { xp: { SpecValues: patchObject } }
            await sdk.Products.PatchVariant(variant.ProductID, variant.Variant.ID!, patchObject)
        } catch (e) {
            const errorID = variant.Variant.ID
            errors[errorID!] = e
        }
    })

    await helpers.batchOperations(specsToUpdate, async function singleOperation(spec): Promise<any> {
        try {
            let newMarkup: number | undefined = Number(spec.PriceMarkup!) / nonResaleDivisor
            if ((spec.PriceMarkup as any) === '0' || spec.PriceMarkup === 0) { newMarkup = undefined }
            await sdk.Specs.PatchOption(spec.SpecID!, spec.OptionID!, { PriceMarkup: newMarkup })
        } catch (e) {
            const errorID = spec.SpecID
            errors[errorID!] = e
        }
    })

    // log and finish
    await helpers.log(errors, 'patch-variant-message.json')
    console.log('done')
}

run();