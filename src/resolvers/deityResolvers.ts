import { IDeity } from '../models/Deity';
import Deity from '../models/Deity';


/*
  name: string;
  parents: [string];
  description: string;
  siblings: [string];
  domain: string;
  gallery: [string];
  favs: number;
  rating: number;
  shared: number;
  children: string;
  isMortal:boolean 
  
  */
const deityResolver = {
    Query: {
        async getDeity(_: any, { id }: { id: string }) {
            return await Deity.findById(id);
        },
        async getDeities() {
            return await Deity.find(); 
        },
    },
    Mutation: {
        async createDeity(_: any, {
            name,
            locality,
            parents,
            description,
            siblings,
            domain,
            gallery,
            favs,
            rating,
            shared,
            children,
            isMortal
        }: IDeity) {
            const deity = new Deity({
                name,
                locality,
                parents,
                description,
                siblings,
                domain,
                gallery,
                favs,
                rating,
                shared,
                children,
                isMortal
            });
            await deity.save();
            return deity;
        },

        async updateDeity(_: any, { id, name,locality,
            parents,
            description,
            siblings,
            domain, 
            gallery,
            favs,
            rating,
            shared,
            children,
            isMortal }: {
                id: string; name: string;
                parents: [string];
                description: string;
                siblings: [string];
                domain: string;
                gallery: [string];
                favs: number;
                rating: number;
                shared: number;
                children: string;
                locality: string;
                isMortal: boolean
            }) {
            const deity = await Deity.findByIdAndUpdate(id, {
                name,
                parents,
                description,
                siblings,
                domain,
                locality,
                gallery,
                favs,
                rating,
                shared,
                children,
                isMortal
            }, { new: true });
            return deity;
        },
        async deleteDeity(_: any, { id }: { id: string }) {
            const deity = await Deity.findByIdAndDelete(id);
            return deity;
        },
    },
};

export default deityResolver;
