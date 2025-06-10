"use server";

import db from "@/db/drizzle";
import { revalidatePath } from "next/cache";
import { getCourseById, getUserProgress } from "@/db/queries";
import { userProgress } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation"


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