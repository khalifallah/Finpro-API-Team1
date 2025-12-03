import { PrismaClient } from "../generated/prisma-client";
import { CreateDiscountRuleRequest, UpdateDiscountRuleRequest, DiscountRuleResponse, DiscountUsageResponse, DiscountQuery, ApplyDiscountRequest } from "../types/discount.types";

const prisma = new PrismaClient();

// Helper: Transform DiscountRule Model to DiscountRuleResponse
const transformDiscountRuleToResponse = (rule: any) : DiscountRuleResponse => ({
    id: rule.id,
    storeId: rule.storeId,
    productId: rule.productId,
    description: rule.description,
    type: rule.type,
    value: rule.value,
    minPurchase: rule.minPurchase,
    maxDiscountAmount: rule.maxDiscountAmount,
    is_active: rule.is_active,
    startDate: rule.startDate,
    endDate: rule.endDate,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    product: rule.product
});

export const getDiscountRules = async (query: DiscountQuery, userStoreId?: number): Promise<{rules: DiscountRuleResponse[], total: number}> => {
    try {
        const {storeId = userStoreId, productId, type, is_active, page =1, limit =10, sortBy = "createdAt", sortOrder = "desc"} = query;
        const skip = (page - 1) * limit;
        const where: any = {deletedAt: null};

        if (storeId) where.storeId = storeId;
        if (productId) where.productId = productId;
        if (type) where.type = type;
        if (is_active !== undefined) where.is_active = is_active;

        const rules = await prisma.discountRule.findMany({
            where,
            include: { product: true },
            skip, take: limit, orderBy: { [sortBy]: sortOrder},
        });
        const total = await prisma.discountRule.count({ where });
        return { rules: rules.map(transformDiscountRuleToResponse) , total };
    } catch (err: any) {
        throw new Error(`Failed to fetch discount rules: ${err.message}`);
    }
};

export const getDiscountRuleById = async (id: number): Promise<DiscountRuleResponse | null> => {
    try {
        const rule = await prisma.discountRule.findUnique({
            where: {id, deletedAt: null},
            include: { product: true},
        });
        return rule ? transformDiscountRuleToResponse(rule) : null;
    } catch (err: any) {
        throw new Error(`Failed to fetch discount rule: ${err.message}`);
    }
};

export const createDiscountRule = async (data: CreateDiscountRuleRequest, storeId: number): Promise<DiscountRuleResponse> => {
    try {
        const rule = await prisma.discountRule.create({
            data: { ...data, storeId },
            include: { product: true },
        });
        return transformDiscountRuleToResponse(rule);
    } catch (err: any) {
        throw new Error(`Failed to create discount rule: ${err.message}`);
    }
};

export const updateDiscountRule = async (id: number, data: UpdateDiscountRuleRequest): Promise<DiscountRuleResponse> => {
    try {
        const updatedRule = await prisma.discountRule.update({
            where: {id},
            data,
            include: { product: true },
        });
        return transformDiscountRuleToResponse(updatedRule);
    } catch (err: any) {
        throw new Error(`Failed to update discount rule: ${err.message}`);
    }
};

export const deleteDiscountRule = async (id: number): Promise<void> => {
    try {
        const rule = await prisma.discountRule.findUnique({ where: {id} });
        if (!rule) throw new Error(`Discount rule with ID ${id} not found`);

        await prisma.discountRule.update({
            where: {id},
            data: { deletedAt: new Date() }
        });

    } catch (err: any) {
        throw err;
    }
}

export const getDeletedDiscountRules = async (query: {page?: number; limit?:number; sortBy?: string; sortOrder?: string})
: Promise<{ rules: DiscountRuleResponse[]; total: number;}> => {
    try {
        const {page =1, limit =10, sortBy = "createdAt", sortOrder = "desc"} = query;
        const skip = (page - 1) * limit;
        const where = { deletedAt: { not: null } };

        const rule = await prisma.discountRule.findMany({
            where,
            skip, take: limit, orderBy: { [sortBy]: sortOrder },
            include: {product: true}
        });
        const total = await prisma.discountRule.count({ where });
        return { rules: rule.map(transformDiscountRuleToResponse) , total };
    } catch (err: any) {
        throw new Error(`Failed to fetch deleted discount rules: ${err.message}`);
    }
};

export const restoreDiscountRule = async (id: number): Promise<DiscountRuleResponse> => {
    try {
        const rule = await prisma.discountRule.findUnique({ where: {id} });
        if (!rule) throw new Error(`Discount rule with ID ${id} not found or not deleted`);

        const restoredRule = await prisma.discountRule.update({
            where: {id},
            data: { deletedAt: null },
            include: {product: true},
        });
        return transformDiscountRuleToResponse(restoredRule);

    } catch (err: any) {
        throw err;
    }
};

export const applyDiscount = async (data: ApplyDiscountRequest): Promise<{discountAmount: number}> => {
    try {
        const { discountRuleId, orderId, subtotal } = data;
        const rule = await prisma.discountRule.findUnique({ where: { id: discountRuleId } });
        if (!rule || !rule.is_active) throw new Error("Invalid or inactive discount rule");

        let discountAmount = 0;
        if (rule.type === "DIRECT_PERCENTAGE") {
            discountAmount = Math.min((subtotal * (rule.value! / 100)), rule.maxDiscountAmount || Infinity);
        } else if (rule.type === "DIRECT_NOMINAL") {
            discountAmount = rule.value!;
        } else if (rule.type === "BOGO") {
            if (!rule.productId) throw new Error("BOGO discount must be associated with a product");

            // Assume product quantity in order; calculate free items
            const order = await prisma.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
            const productItem = order?.orderItems.find(item => item.productId === rule.productId);
            if (productItem && productItem.quantity >= 1) {
                
                const freeQuantity = 1;  
                discountAmount = freeQuantity * productItem.priceAtPurchase;
            }
        }
        // Record discount usage
        await prisma.discountUsage.create({
            data: { discountRuleId, orderId, amount: discountAmount }
        });
        return { discountAmount };
    } catch (err: any) {
        throw err;
    }
};

// Get usages for reporting
export const getDiscountUsages = async (discountRuleId: number): Promise<DiscountUsageResponse[]> => {
    try {
        return await prisma.discountUsage.findMany({
            where: { discountRuleId },
        });
    } catch (err: any) {
        throw new Error(`Failed to fetch discount usages: ${err.message}`);
    }
};
