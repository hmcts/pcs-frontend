import { Application } from 'express';
import { isLegalRepresentativeUser } from '../steps/utils';

/**
 * Whitelist paths based on whether legalRepresentative journey
 */
export function whiteListPaths(app: Application): void {
    const basePaths = ['/case'];
    const citizenPaths = [...basePaths, '/dashboard'];

    app.use((req, res, next) => {
        const allowedPaths = isLegalRepresentativeUser(req) ? basePaths : citizenPaths;

        const isAllowed = allowedPaths.some(path =>
            req.path.startsWith(path)
        );

        if (isAllowed) {
            return next();
        }

        res.status(404).send('Not Found');
    });
}
