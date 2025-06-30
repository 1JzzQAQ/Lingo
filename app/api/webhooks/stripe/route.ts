import db from "@/db/drizzle"
import { userSubscription } from "@/db/schema"
import { stripe } from "@/lib/stripe"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req:Request) {
    //Stripe Webhook 的请求体是原始文本,用req.text() 获取
    const body = await req.text()
    //从请求头中读取 Stripe 签名
    const signature = (await headers()).get("Stripe-Signature") as string
    //ts类型声明
    let event:Stripe.Event

    try{
        //使用constructEvent() 校验这个请求是否是合法的 Stripe 消息
        event = stripe.webhooks.constructEvent(
            //原始请求体
            body,
            //签名头
            signature,
            //控制台配置的 webhook secret
            process.env.STRIPE_WEBHOOK_SECRET!,
        )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }catch (error:any){
        return new NextResponse(`Webhook error: ${error.message}`,{
            status:400,
        })
    }

    const session = event.data.object as Stripe.Checkout.Session

    if(event.type === "checkout.session.completed"){
        const subscription = await stripe.subscriptions.retrieve(
            //用 session 中的 subscription 字段（是订阅的 ID）从 Stripe 拉取订阅的完整信息
            session.subscription as string
        )

        if(!session?.metadata?.userId){
            return new NextResponse("User ID is required",{status:400})
        }

        await db.insert(userSubscription).values({
            userId: session.metadata.userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
            )
        })
    }

    if(event.type === "invoice.payment_succeeded"){
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        )

        await db.update(userSubscription).set({
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
            )
        }).where(eq(userSubscription.stripeSubscriptionId,subscription.id))
    }    

    return new NextResponse(null,{status:200})
}