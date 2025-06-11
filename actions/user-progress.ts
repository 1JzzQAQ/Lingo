"use server";

import db from "@/db/drizzle";
import { revalidatePath } from "next/cache";
import { getCourseById, getUserProgress } from "@/db/queries";
import { challengeProgress, challenges, userProgress } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm";


export const upsertUserProgress = async (courseId:number) =>{
    const { userId } = await auth();
    const user = await currentUser();

    if(!userId || !user){
        throw new Error("Unauthorized")
    }

    const course = await getCourseById(courseId)

    if(!course){
        throw new Error("Course not found");
    }


    // TODO: Enable once units and lessons are added
    // if(!course.units.length || !course.units[0].lessons.length){
    //     throw new Error("Course is empty")
    // }

    const existingUserProgress = await getUserProgress();

    if(existingUserProgress){
        await db.update(userProgress).set({
            activeCourseId: courseId,
            userName:user.firstName || "user",
            userImageSrc:user.imageUrl || "/mascot.svg"
        })
        //手动清除特定路径的缓存，强制 Next.js 在下次访问时重新生成页面
        revalidatePath("/courses")
        revalidatePath("/learn")
        redirect("/learn")
    }

    await db.insert(userProgress).values({
        userId,
        activeCourseId: courseId,
        userName:user.firstName || "user",
        userImageSrc:user.imageUrl || "/mascot.svg"
    })
    //手动清除特定路径的缓存，强制 Next.js 在下次访问时重新生成页面
    revalidatePath("/courses")
    revalidatePath("/learn")
    redirect("/learn")
}

export const reduceHeatrs = async(challengeId: number) => {
    const {userId} = await auth()

    if(!userId){
        throw new Error("Unauthorized")
    }

    const currentUserProgress = await getUserProgress()
    //TODO: Get user subscription

    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId)
    })
    
    if(!challenge){
        throw new Error("Challenge not found")
    }

    const lessonId = challenge.lessonId

    const existingChallengeProgress = await db.query.challengeProgress.findFirst({
        where: and(
            eq(challengeProgress.userId,userId),
            eq(challengeProgress.challengeId,challengeId)
        )
    })

    const isPractice = !!existingChallengeProgress

    if(isPractice){
        return {error:"Practice"}
    }

    if(!currentUserProgress){
        throw new Error("User progress not found")
    }

    //TODO: Handle subscription

    if (currentUserProgress.hearts === 0){
        return {error:"hearts"}
    }

    await db.update(userProgress).set({
        hearts:Math.max(currentUserProgress.hearts - 1, 0)
    }).where(eq(userProgress.userId,userId))  
    
    revalidatePath("/shop")
    revalidatePath("/learn")
    revalidatePath("/quests")
    revalidatePath("/leaderboard")
    revalidatePath(`/lesson/${lessonId}`)
}