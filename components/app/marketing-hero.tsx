import { Link } from "@navigation"

import { getTranslations } from "next-intl/server"
import { RetroGrid } from "@/components/fancy/retro-grid"
import { ShimmerButton } from "@/components/ui/button"
import { NumberTicker } from "@/components/fancy/number-ticker"

export async function MarketingHero() {
    const t = await getTranslations("app.componenets.app.marketing-hero")

    return (
        <div className="relative border-b border-b-[#ffffff1a] pb-10">
            <Blur />
            <RetroGrid className="opacity-20" />
            <div className="container relative ml-auto pt-20 md:pt-36">
                <div className="mx-auto text-center lg:w-[70%]">
                    <h1 className="text-5xl font-extrabold text-zinc-900 md:text-6xl xl:text-7xl dark:text-white">
                        Read about Million Lint 1.0-rc
                        <span className="gradient-text inline-block">
                            <NumberTicker value={80} />% Speed up your
                            website by
                        </span>
                    </h1>
                    <p className="mt-8 text-xl leading-8 text-zinc-600 dark:text-zinc-300">
                        aaaaaaaaaaaa
                        <span className="font-medium dark:text-zinc-100">
                            bbbbbbbbbbb
                        </span>{" "}
                        ccccccccccccc
                        <Link
                            href="/docs/introduction"
                            className="font-medium hover:underline"
                        >
                            ddddddddddd
                        </Link>
                        !
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-4">
                        <Link href="/docs/introduction" className="w-full sm:w-max">
                            <ShimmerButton
                                className="relative flex w-full items-center justify-center transition-all hover:shadow-[0_0_0_3px_rgba(255,255,255,0.3)_inset] sm:w-max"
                                background="radial-gradient(ellipse 80% 70% at 50% 120%, #4d94ff, #1a75ff)"
                            >
                                <span className="relative z-10 whitespace-pre text-center text-base font-semibold leading-none tracking-tight text-white">
                                    eeeeeeeee
                                </span>
                            </ShimmerButton>

                        </Link>
                        <Link
                            href="/blog/virtual-dom"
                            className="relative flex h-11 w-full items-center justify-center px-6 before:absolute before:inset-0 before:rounded-full before:border before:border-transparent before:bg-blue-600/10 before:bg-gradient-to-b before:transition before:duration-300 hover:before:scale-105 active:duration-75 active:before:scale-95 sm:w-max dark:before:border-zinc-700 dark:before:bg-zinc-800"
                        >
                            <span className="relative text-base font-semibold text-blue-600 dark:text-white">
                                f
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function Blur() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 dark:opacity-20"
        >
            <div className="fix-safari-blur h-56 bg-gradient-to-br from-blue-500 to-blue-400 blur-[106px] dark:from-sky-700"></div>
            <div className="fix-safari-blur h-32 bg-gradient-to-r from-sky-400 to-blue-300 blur-[106px] dark:to-blue-600"></div>
        </div>
    )
}

